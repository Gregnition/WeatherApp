// ===== CONFIG =====
const apiKey = "YOUR_API_KEY_HERE";

// ===== DOM ELEMENTS =====
const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const weatherResults = document.getElementById("weatherResults");
const cityList = document.getElementById("cityList");
const geoBtn = document.getElementById("geoBtn");
const themeBtn = document.getElementById("themeBtn");
const errorMsg = document.getElementById("errorMsg");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const unitToggleBtn = document.getElementById("unitToggle");

// ===== LOCAL STORAGE =====
let savedCities = JSON.parse(localStorage.getItem("savedCities")) || [];
let useCelsius = true;

// ===== LOTTIE ANIMATION MAP =====
const animationMap = {
    "01d": "Weather-sunny.json", "01n": "Weather-night-clear.json",
    "02d": "Weather-partly-cloudy.json", "02n": "Weather-night-partly-cloudy.json",
    "03d": "Weather-cloudy.json", "03n": "Weather-night-partly-cloudy.json",
    "04d": "Weather-cloudy.json", "04n": "Weather-night-partly-cloudy.json",
    "09d": "Weather-rain.json", "09n": "Weather-night-rain.json",
    "10d": "Weather-rain.json", "10n": "Weather-night-rain.json",
    "11d": "Weather-storm.json", "11n": "Weather-night-storm.json",
    "13d": "Weather-snow.json", "13n": "Weather-night-snow.json",
    "50d": "Weather-mist.json", "50n": "Weather-night-mist.json"
};

// ===== EVENT LISTENERS =====
weatherForm.addEventListener("submit", e => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) fetchAndDisplayWeather(city);
    cityInput.value = "";
});

geoBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        }, () => showError("Unable to retrieve location."));
        console.log(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude);
    } else showError("Geolocation not supported.");
});

themeBtn.addEventListener("click", () => {
    document.body.dataset.theme =
        document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", document.body.dataset.theme);
});

deleteAllBtn.addEventListener("click", () => {
    savedCities = [];
    localStorage.setItem("savedCities", JSON.stringify(savedCities));
    renderSavedCities();
    weatherResults.innerHTML = "";
});

unitToggleBtn.addEventListener("click", () => {
    useCelsius = !useCelsius;
    localStorage.setItem("useCelsius", useCelsius); // save preference
    unitToggleBtn.textContent = useCelsius ? "°C / °F" : "°F / °C";

    document.querySelectorAll(".temp").forEach(el => {
        const tempF = parseFloat(el.dataset.f);
        el.textContent = formatTemp(tempF);
    });
});


// ===== INIT =====
document.body.dataset.theme = localStorage.getItem("theme") || "light";

// Load saved temperature unit
useCelsius = localStorage.getItem("useCelsius") === "false" ? false : true;
unitToggleBtn.textContent = useCelsius ? "°C / °F" : "°F / °C";

renderSavedCities();
savedCities.forEach(city => fetchAndDisplayWeather(city));


// ===== FUNCTIONS =====
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add("show");
    setTimeout(() => errorMsg.classList.remove("show"), 3000);
}

function saveCity(city) {
    if (!savedCities.includes(city)) {
        savedCities.push(city);
        localStorage.setItem("savedCities", JSON.stringify(savedCities));
        renderSavedCities();
    }
}

function renderSavedCities() {
    cityList.innerHTML = "";
    if (savedCities.length === 0) return;

    savedCities.forEach(city => {
        const tag = document.createElement("span");
        tag.classList.add("city-tag");
        tag.textContent = city;
        tag.addEventListener("click", () => fetchAndDisplayWeather(city));

        // Show tooltip with temperature & weather on hover
        tag.addEventListener("mouseenter", async () => {
            const data = await getWeatherData(city);
            tag.title = `Temp: ${formatTemp(data.main.temp)} | ${data.weather[0].description}`;
        });

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✖";
        removeBtn.style.marginLeft = "6px";
        removeBtn.style.border = "none";
        removeBtn.style.background = "#fcf8f8ff";
        removeBtn.style.color = "#444";
        removeBtn.style.borderRadius = "50%";
        removeBtn.style.cursor = "pointer";

        removeBtn.addEventListener("click", e => {
            e.stopPropagation();
            savedCities = savedCities.filter(c => c !== city);
            localStorage.setItem("savedCities", JSON.stringify(savedCities));
            renderSavedCities();
            const card = document.querySelector(`[data-city="${city}"]`);
            if (card) card.remove();
        });

        tag.appendChild(removeBtn);
        cityList.appendChild(tag);
    });
}


async function fetchAndDisplayWeather(city) {
    try {
        const data = await getWeatherData(city);
        displayWeatherCard(data);

        // Update day/night icon in header
        const isNight = data.dt < data.sys.sunrise || data.dt > data.sys.sunset;
        const dayNightIcon = document.getElementById("dayNightIcon");
        if (dayNightIcon) dayNightIcon.textContent = isNight ? "🌙" : "☀️";

        saveCity(data.name);
    } catch (err) {
        console.error(err);
        showError(`Could not fetch weather for "${city}"`);
    }
}


async function fetchWeatherByCoords(lat, lon) {
    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Error fetching location weather");
        const data = await res.json();
        displayWeatherCard(data);
        saveCity(data.name);
    } catch (err) {
        console.error(err);
        showError("Unable to fetch location weather.");
    }
}

async function getWeatherData(city) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("City not found");
    return res.json();
}

function displayWeatherCard(data) {
    const { name: city, main: { temp, humidity }, weather } = data;
    const weatherObj = weather[0];
    const isNight = data.dt < data.sys.sunrise || data.dt > data.sys.sunset;

    setBackgroundTheme(weatherObj.id, isNight);

    let card = document.querySelector(`[data-city="${city}"]`);
    if (!card) {
        card = document.createElement("div");
        card.classList.add("weather-card");
        card.dataset.city = city;
        weatherResults.appendChild(card);
    }

    card.innerHTML = `
        <h2>${city}</h2>
        <div class="weather-icon-container" id="animation-${city}"></div>
        <div class="temp" data-f="${temp}">${formatTemp(temp)}</div>
        <p>${weatherObj.description}</p>
        <p>Humidity: ${humidity}%</p>
        <div class="forecast" id="forecast-${city}"></div>
        <button class="remove-btn">Remove</button>
    `;

    card.style.opacity = 0;
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
        card.style.transition = "all 0.5s ease";
        card.style.opacity = 1;
        card.style.transform = "translateY(0)";
    }, 50);

    loadCardAnimation(weatherObj.icon, `animation-${city}`);
    card.querySelector(".remove-btn").addEventListener("click", () => {
        card.remove();
        savedCities = savedCities.filter(c => c !== city);
        localStorage.setItem("savedCities", JSON.stringify(savedCities));
        renderSavedCities();
    });

    fetchForecast(city, `forecast-${city}`);
}

function setBackgroundTheme(weatherId, isNight = false) {
    const effect = document.getElementById("weatherEffect");
    document.body.className = "";
    effect.className = "";
    effect.innerHTML = "";

    // Basic gradients
    let gradient = "";
    if (weatherId >= 200 && weatherId < 300) gradient = isNight ? "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)" : "linear-gradient(to bottom, #485563, #29323c)";
    else if (weatherId >= 300 && weatherId < 600) gradient = isNight ? "linear-gradient(to bottom, #1e3c72, #2a5298)" : "linear-gradient(to bottom, #74ebd5, #ACB6E5)";
    else if (weatherId >= 600 && weatherId < 700) gradient = isNight ? "linear-gradient(to bottom, #000428, #004e92)" : "linear-gradient(to bottom, #e0eafc, #cfdef3)";
    else if (weatherId >= 700 && weatherId < 800) gradient = isNight ? "linear-gradient(to bottom, #2c3e50, #4ca1af)" : "linear-gradient(to bottom, #bdc3c7, #2c3e50)";
    else if (weatherId === 800) gradient = isNight ? "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)" : "linear-gradient(to bottom, #fceabb, #f8b500)";
    else if (weatherId >= 801) gradient = isNight ? "linear-gradient(to bottom, #232526, #414345)" : "linear-gradient(to bottom, #d7d2cc, #304352)";
    else gradient = isNight ? "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)" : "linear-gradient(to bottom, #74ebd5, #ACB6E5)";
    document.body.style.background = gradient;

    // Rain
    if(weatherId >= 300 && weatherId < 600) {
        effect.classList.add("rain");
        for(let i=0;i<100;i++){
            const drop=document.createElement("span");
            drop.style.left=Math.random()*100+"vw";
            drop.style.animationDuration=0.5+Math.random()*0.5+"s";
            effect.appendChild(drop);
        }
    }
    // Snow
    else if(weatherId >= 600 && weatherId < 700) {
        effect.classList.add("snow");
        for(let i=0;i<50;i++){
            const flake=document.createElement("span");
            flake.style.left=Math.random()*100+"vw";
            flake.style.animationDuration=2+Math.random()*2+"s";
            flake.style.width=3+Math.random()*3+"px";
            flake.style.height=3+Math.random()*3+"px";
            effect.appendChild(flake);
        }
    }
    // Fog
    else if(weatherId >= 700 && weatherId < 800) effect.classList.add("fog");

    // Clouds for cloudy weather
    else if(weatherId >= 801) {
        for(let i=0;i<5;i++){
            const cloud = document.createElement("div");
            cloud.classList.add("cloud");
            cloud.style.top = Math.random()*50+"%";
            cloud.style.animationDuration = 30+Math.random()*20+"s";
            cloud.style.left = -Math.random()*500+"px";
            effect.appendChild(cloud);
        }
    }

    // Sunny weather rays
    else if(weatherId === 800 && !isNight) {
        for(let i=0;i<3;i++){
            const ray = document.createElement("div");
            ray.classList.add("sun-ray");
            ray.style.top = 10 + i*20 + "%";
            ray.style.animationDuration = 15 + i*5 + "s";
            effect.appendChild(ray);
        }
    }

    // Stars for clear night
    else if(weatherId === 800 && isNight){
        for(let i=0;i<50;i++){
            const star = document.createElement("div");
            star.classList.add("star");
            star.style.top = Math.random()*100+"%";
            star.style.left = Math.random()*100+"%";
            star.style.width = star.style.height = Math.random()*2 + 1 + "px";
            star.style.animationDuration = (1 + Math.random()*2) + "s";
            effect.appendChild(star);
        }
    }
}




function formatTemp(tempF) {
    return useCelsius ? `${Math.round((tempF - 32) * 5/9)}°C` : `${Math.round(tempF)}°F`;
}

function loadCardAnimation(iconCode, containerId) {
    const animFile = animationMap[iconCode] || "Weather-sunny.json";
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    lottie.loadAnimation({
        container: container,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: `lottie/${animFile}`
    });
}

async function fetchForecast(city, containerId) {
    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=imperial`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Forecast not found");
        const data = await res.json();

        const dailyData = data.list.filter(item => item.dt_txt.includes("12:00:00"));
        displayForecast(dailyData, containerId);
    } catch (err) {
        console.error("Error fetching forecast:", err);
    }
}

function displayForecast(forecastList, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    container.classList.add("forecast-container");

    forecastList.forEach((day, index) => {
        const date = new Date(day.dt * 1000);
        const temp = day.main.temp.toFixed(1);
        const weatherObj = day.weather[0];

        const forecastEl = document.createElement("div");
        forecastEl.classList.add("forecast-day");
        forecastEl.innerHTML = `
            <div>${date.toLocaleDateString("en-US",{ weekday:"short" })}</div>
            <div class="forecast-icon" id="forecast-${containerId}-${index}"></div>
            <div>${formatTemp(temp)}</div>
        `;

        container.appendChild(forecastEl);

        const animFile = animationMap[weatherObj.icon] || "Weather-sunny.json";
        lottie.loadAnimation({
            container: document.getElementById(`forecast-${containerId}-${index}`),
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: `lottie/${animFile}`
        });
    });
}




//testing collapsible city cards for saved cities
function renderCityCard(city, weatherData) {
  const container = document.querySelector(".saved-cities");

  const card = document.createElement("div");
  card.className = "city-card";
  card.dataset.city = city;

  card.innerHTML = `
    <div class="city-header">
      <h3>${city}</h3>
      <button class="remove-city">✖</button>
    </div>
    <div class="city-content">
      <p class="temperature">${weatherData.temp}°C</p>
      <p>${weatherData.description}</p>
    </div>
  `;

  container.appendChild(card);

  // Toggle collapse when clicking the header
  card.querySelector(".city-header").addEventListener("click", () => {
    card.classList.toggle("collapsed");
  });

  // Remove city
  card.querySelector(".remove-city").addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent collapsing when removing
    removeCity(city);
    card.remove();
  });
}
