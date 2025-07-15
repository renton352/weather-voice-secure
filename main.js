// NFCタグチェック
if (window.location.hash !== "#NfcTag") {
  window.location.href = "denied.html";
  throw new Error("アクセス拒否：NFCタグからのアクセスではありません");
}

const apiKey = "a8bc86e4c135f3c44f72bb4b957aa213";
const params = new URLSearchParams(window.location.search);
const ip = 

// URLからパラメータを取得した後に、アドレスバーの表示を消す
if (window.history.replaceState) {
  window.history.replaceState(null, "", location.pathname);
}params.get("ip") || "animeA";
const ch = params.get("ch") || "alice";

const characterJsonPath = `characters/${ip}/${ch}.json`;
const imgBasePath = `img/${ip}/`;

async function fetchWeather() {
  const response = await fetch("https://api.openweathermap.org/data/2.5/weather?lat=35.6895&lon=139.6917&units=metric&lang=ja&appid=" + apiKey);
  const data = await response.json();
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
  const res = await fetch(characterJsonPath);
  if (!res.ok) {
    window.location.href = "denied.html";
    return;
  }
  const character = await res.json();

  const weatherData = await fetchWeather();
  const feelsLike = weatherData.feels_like;
  const feelingCategory = getFeelingCategory(feelsLike);
  document.getElementById("temp").textContent = `気温: ${weatherData.temp}℃`;

  const now = new Date();
  const hour = now.getHours();
  window.timeSlotA = getTimeSlotA(hour);
  const weekday = getWeekdayName(now);

  const currentTime = Math.floor(Date.now() / 1000);
  const sunrise = weatherData.sunrise;
  const sunset = weatherData.sunset;
  const timeSlotB = getTimeSlotB(currentTime, sunrise, sunset);

  const weather = normalizeWeather(weatherData.weather);
  const bgPath = `${imgBasePath}bg_${timeSlotB}_${weather}.png`;
  document.getElementById("background").src = bgPath;

  const expression = character.expressions[timeSlotA] || `${ch}_normal.png`;
  document.getElementById("character").src = `${imgBasePath}${expression}`;

  // 3カテゴリ中からランダムに2つ選んで、それぞれ1セリフ取得
  const values = {
    timeSlotA: timeSlotA,
    feelingCategory: feelingCategory,
    weekday: weekday
  };

  const categories = ["timeSlotA", "feelingCategory", "weekday"];
  const selected = categories.sort(() => 0.5 - Math.random()).slice(0, 2);

  const lines = character.lines || {};
  const messages = selected.map(key => {
    return lines[key]?.[values[key]] || "セリフが見つかりません";
  });

  document.getElementById("line").textContent = messages.join("\n");

  // Debug log
  console.log("[DEBUG] Selected Categories:", selected);
  console.log("[DEBUG] timeSlotA:", timeSlotA);
  console.log("[DEBUG] timeSlotB:", timeSlotB);
  console.log("[DEBUG] weekday:", weekday);
  console.log("[DEBUG] weather:", weather);
  console.log("[DEBUG] feelsLike:", feelsLike);
  console.log("[DEBUG] feelingCategory:", feelingCategory);
  console.log("[DEBUG] Lines:", messages);
  console.log("[DEBUG] background:", bgPath);
  


  


  ["character-cover", "line", "background", "character", "temp"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        const audioPath = `voice/${ip}/${ch}/${window.timeSlotA}.wav`;
        console.log("[DEBUG] Tap detected on:", id);
        console.log("[DEBUG] Attempting to play:", audioPath);
        const audio = new Audio(audioPath);
        audio.play().catch(e => console.warn("再生失敗:", e));
      }, { once: true });
    }
  });

}

main();

