const token = new URLSearchParams(window.location.search).get("token");
console.log("[DEBUG] token:", token);

fetch("token-map.json")
  .then(res => res.json())
  .then(map => {
    console.log("[DEBUG] token-map.json:", map);
    const entry = map[token];
    console.log("[DEBUG] entry:", entry);
    if (!entry || !entry.ip || !entry.character) {
      document.body.innerHTML = "<h1>NFCタグをスキャンしてアクセスしてください</h1>";
      throw new Error("無効なトークン");
    }
    startApp(entry.character, entry.ip);
  });

function startApp(ch, ip) {
  console.log("[DEBUG] startApp:", ch, ip);
  if (window.history.replaceState) {
    window.history.replaceState(null, "", location.pathname);
  }

  const characterJsonPath = `characters/${ip}/${ch}.json`;
  const imgBasePath = `img/${ip}/`;
  const apiKey = "a8bc86e4c135f3c44f72bb4b957aa213";

  // ===== Audio 再生ヘルパー =====
  const audioEl = new Audio();
  audioEl.preload = "none"; // 必要になったときに読み込む
  audioEl.onerror = (e) => console.warn("[DEBUG] audio decode error:", audioEl.src, e);
  audioEl.onplay = () => console.log("[DEBUG] Playing audio:", audioEl.src);

  const timeSlotAlias = {
    midnight: ["midnight", "night"],
    early_morning: ["early_morning", "morning"],
    morning: ["morning"],
    noon: ["noon"],
    afternoon: ["afternoon"],
    evening: ["evening"]
  };

  async function tryPlay(src) {
    try {
      const head = await fetch(src, { method: "HEAD" });
      if (!head.ok) {
        console.log("[DEBUG] audio not found:", src, head.status);
        return false;
      }
      audioEl.src = src;
      audioEl.load(); // 明示的にロード
      audioEl.currentTime = 0;
      await audioEl.play();
      return true;
    } catch (e) {
      console.warn("[DEBUG] play failed:", src, e);
      return false;
    }
  }

  async function playVoiceWithFallback(baseDir, slot) {
    const names = timeSlotAlias[slot] || [slot];
    const candidates = [];
    for (const n of names) {
      candidates.push(`${baseDir}${n}.wav`);
      // candidates.push(`${baseDir}${n}.mp3`);
    }
    // 最後にデフォルト
    candidates.push(`${baseDir}default.wav`);
    // candidates.push(`${baseDir}default.mp3`);

    for (const src of candidates) {
      if (await tryPlay(src)) return true;
    }
    console.warn("[DEBUG] 再生可能なボイスファイルが見つかりませんでした");
    return false;
  }
  // ===== /Audio 再生ヘルパー =====

  // --- 天気の正規化（背景切替／表示用） ---
  function normalizeWeather(w) {
    const s = (w || "").toLowerCase();
    if (s.includes("rain") || s.includes("thunderstorm") || s.includes("drizzle")) return "rainy";
    if (s.includes("cloud") || s.includes("mist") || s.includes("fog") || s.includes("haze") ||
        s.includes("smoke") || s.includes("dust") || s.includes("ash") || s.includes("sand")) return "cloudy";
    if (s.includes("snow")) return "snowy";
    return "sunny";
  }
  // 日本語表記（バッジ用）
  function toJapaneseWeather(norm) {
    switch (norm) {
      case "sunny":  return "晴れ";
      case "cloudy": return "くもり";
      case "rainy":  return "雨";
      case "snowy":  return "雪";
      default:       return "—";
    }
  }

  async function fetchWeather() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(async position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const url =
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ja&appid=${apiKey}`;
        console.log("[DEBUG] weatherAPI:", url);
        try {
          const response = await fetch(url);
          const data = await response.json();
          console.log("[DEBUG] weatherData:", data);
          resolve({
            temp: Math.round(data.main.temp),
            feels_like: Math.round(data.main.feels_like),
            weatherMain: (data.weather && data.weather[0] && data.weather[0].main) ? data.weather[0].main : "",
            sunrise: data.sys.sunrise,
            sunset: data.sys.sunset
          });
        } catch (err) {
          reject(err);
        }
      }, error => {
        console.error("位置情報の取得に失敗しました", error);
        document.body.innerHTML = "<h1>位置情報の取得に失敗しました</h1>";
        reject(error);
      });
    });
  }

  function getTimeSlotA(hour) {
    if (hour < 6) return "midnight";
    if (hour < 9) return "early_morning";
    if (hour < 12) return "morning";
    if (hour < 15) return "noon";
    if (hour < 18) return "afternoon";
    return "evening";
  }

  function getTimeSlotB(now, sunrise, sunset) {
    const oneHour = 60 * 60;
    if (now < sunrise - oneHour || now > sunset + oneHour) return "night";
    if (now >= sunrise - oneHour && now <= sunrise + oneHour) return "before_sunrise";
    if (now >= sunset - oneHour && now <= sunset + oneHour) return "sunset";
    return "daytime";
  }

  function getFeelingCategory(feelsLike) {
    if (feelsLike >= 35) return "veryhot";
    if (feelsLike >= 30) return "hot";
    if (feelsLike >= 22) return "warm";
    if (feelsLike >= 15) return "cool";
    if (feelsLike >= 7)  return "cold";
    return "verycold";
  }

  function getWeekdayName(date) {
    return ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][date.getDay()];
  }

  async function main() {
    console.log("[DEBUG] fetch character JSON:", characterJsonPath);
    const res = await fetch(characterJsonPath);
    if (!res.ok) {
      document.body.innerHTML = "<h1>キャラデータの読み込みに失敗しました</h1>";
      return;
    }
    const character = await res.json();
    console.log("[DEBUG] character JSON:", character);

    // 天気取得
    const weatherData = await fetchWeather();
    const feelsLike = weatherData.feels_like;
    const feelingCategory = getFeelingCategory(feelsLike);

    // --- バッジ表示（気温・日付・天気） ---
    const tempEl = document.getElementById("temp");
    if (tempEl) tempEl.textContent = `気温: ${weatherData.temp}℃`;

    { // 日付（端末ローカル）
      const d = new Date();
      const w = ["日","月","火","水","木","金","土"][d.getDay()];
      const txt = `${d.getMonth()+1}月${d.getDate()}日(${w})`;
      const dateEl = document.getElementById("date");
      if (dateEl) dateEl.textContent = txt;
    }

    // 追加：天気バッジ
    const normalizedWeather = normalizeWeather(weatherData.weatherMain);
    const weatherEl = document.getElementById("weather");
    if (weatherEl) weatherEl.textContent = `天気: ${toJapaneseWeather(normalizedWeather)}`;

    // --- 背景・キャラ切替 ---
    const now = new Date();
    const hour = now.getHours();
    const timeSlotA = getTimeSlotA(hour);
    const weekday = getWeekdayName(now);

    const currentTime = Math.floor(Date.now() / 1000);
    const timeSlotB = getTimeSlotB(currentTime, weatherData.sunrise, weatherData.sunset);
    const bgPath = `${imgBasePath}bg_${timeSlotB}_${normalizedWeather}.png`;
    const bgEl = document.getElementById("background");
    if (bgEl) bgEl.src = bgPath;

    const expression = character.expressions[timeSlotA] || `${ch}_normal.png`;
    const charEl = document.getElementById("character");
    if (charEl) charEl.src = `${imgBasePath}${expression}`;

    // --- セリフ選択 ---
    const values = { timeSlotA, feelingCategory, weekday };
    console.log("[DEBUG] values for line selection:", values);

    const categories = ["timeSlotA", "feelingCategory", "weekday"];
    const selected = categories.sort(() => 0.5 - Math.random()).slice(0, 2);
    console.log("[DEBUG] selected categories:", selected);

    const lines = character.lines || {};
    const messages = selected.map(key => lines[key]?.[values[key]] || "セリフが見つかりません");
    const lineEl = document.getElementById("line");
    if (lineEl) lineEl.textContent = messages.join("\n");

    // --- タップ/クリックでボイス再生（#weatherも追加） ---
    const base = `voice/${ip}/${ch}/`;
    const targets = ["character-cover", "line", "background", "character", "temp", "weather"];
    const handler = () => playVoiceWithFallback(base, timeSlotA);

    targets.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", handler, { passive: true });
      el.addEventListener("touchend", handler, { passive: true });
    });
  }

  main();
}
