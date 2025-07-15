const token = new URLSearchParams(window.location.search).get("token");
console.log("[DEBUG] token:", token);

fetch("token-map.json")
  .then(res => res.json())
  .then(map => {
    console.log("[DEBUG] token-map.json:", map);
    const entry = map[token];
    console.log("[DEBUG] entry:", entry);
    if (!entry || !entry.ip || !entry.character) {
      document.body.innerHTML = "<h1>無効なトークンです</h1>";
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

  async function fetchWeather() {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=35.6895&lon=139.6917&units=metric&lang=ja&appid=${apiKey}`;
    console.log("[DEBUG] weatherAPI:", url);
    const response = await fetch(url);
    const data = await response.json();
    console.log("[DEBUG] weatherData:", data);
    return {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      weather: data.weather[0].main.toLowerCase(),
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset
    };
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

  function normalizeWeather(w) {
    if (w.includes("rain")) return "rainy";
    if (w.includes("cloud")) return "cloudy";
    if (w.includes("snow")) return "snowy";
    return "sunny";
  }

  function getFeelingCategory(feelsLike){
    if (feelsLike >= 35) return "veryhot";
    if (feelsLike >= 30) return "hot";
    if (feelsLike >= 22) return "warm";
    if (feelsLike >= 15) return "cool";
    if (feelsLike >= 7)  return "cold";
    return "verycold";
  }

  function getWeekdayName(date) {
    return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
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

    const weatherData = await fetchWeather();
    const feelsLike = weatherData.feels_like;
    const feelingCategory = getFeelingCategory(feelsLike);
    document.getElementById("temp").textContent = `気温: ${weatherData.temp}℃`;

    const now = new Date();
    const hour = now.getHours();
    const timeSlotA = getTimeSlotA(hour);
    const weekday = getWeekdayName(now);

    const currentTime = Math.floor(Date.now() / 1000);
    const timeSlotB = getTimeSlotB(currentTime, weatherData.sunrise, weatherData.sunset);
    const weather = normalizeWeather(weatherData.weather);
    const bgPath = `${imgBasePath}bg_${timeSlotB}_${weather}.png`;
    document.getElementById("background").src = bgPath;

    const expression = character.expressions[timeSlotA] || `${ch}_normal.png`;
    document.getElementById("character").src = `${imgBasePath}${expression}`;

    const values = { timeSlotA, feelingCategory, weekday };
    console.log("[DEBUG] values for line selection:", values);

    const categories = ["timeSlotA", "feelingCategory", "weekday"];
    const selected = categories.sort(() => 0.5 - Math.random()).slice(0, 2);
    console.log("[DEBUG] selected categories:", selected);

    const lines = character.lines || {};
    const messages = selected.map(key => lines[key]?.[values[key]] || "セリフが見つかりません");
    document.getElementById("line").textContent = messages.join("\n");

    ["character-cover", "line", "background", "character", "temp"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", () => {
          const audioPath = `voice/${ip}/${ch}/${timeSlotA}.wav`;
          console.log("[DEBUG] Playing audio:", audioPath);
          const audio = new Audio(audioPath);
          audio.play().catch(e => console.warn("再生失敗:", e));
        }, { once: true });
      }
    });
  }

  main();
}