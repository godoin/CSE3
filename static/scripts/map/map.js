import { attachInputHandlerById } from "../shared/eventHandlers.js";
// import {
//   highlightFeature,
//   resetHighlight,
//   zoomToFeature,
//   onEachFeature,
// } from "./mapUtils.js";

let geoJson;
let map = L.map("map");
let tiles;
let info = L.control();
let legend = L.control();
let selectedYear = "All";

const highlightFeature = (e) => {
  var layer = e.target;

  layer.setStyle({
    weight: 5,
    color: "#666",
    dashArray: "",
    fillOpacity: 0.7,
  });

  layer.bringToFront();
};

const resetHighlight = (e) => {
  geoJson.resetStyle(e.target);
};

const zoomToFeature = (e) => {
  map.fitBounds(e.target.getBounds());
};

const onEachFeature = (feature, layer) => {
  layer.on({
    mouseover: (e) => {
      highlightFeature(e);
      info.update(layer.feature.properties);
    },
    mouseout: (e) => {
      resetHighlight(e);
      info.update();
    },
    click: zoomToFeature,
  });
};


const getColor = async (name) => {
  const jsonUrl = "static/assets/json/data.json";
  const country = await fetch(jsonUrl)
    .then((res) => res.json())
    .then((data) => data.find((country) => country.name === name))
    .catch((err) => console.error(`Error fetching data: ${err}..`));

  const mortality = country?.total_mortality || 0;

  return mortality > 750000
    ? "#082f49"
    : mortality > 500000
    ? "#0c4a6e"
    : mortality > 250000
    ? "#075985"
    : mortality > 100000
    ? "#0369a1"
    : mortality > 50000
    ? "#0284c7"
    : mortality > 25000
    ? "#0ea5e9"
    : mortality > 10000
    ? "#38bdf8"
    : mortality > 5000
    ? "#7dd3fc"
    : mortality > 1000
    ? "#e0f2fe"
    : "#f0f9ff";
};

const standardLegendColors = (mortality) => {
  return mortality > 750000
    ? "#082f49"
    : mortality > 500000
    ? "#0c4a6e"
    : mortality > 250000
    ? "#075985"
    : mortality > 100000
    ? "#0369a1"
    : mortality > 50000
    ? "#0284c7"
    : mortality > 25000
    ? "#0ea5e9"
    : mortality > 10000
    ? "#38bdf8"
    : mortality > 5000
    ? "#7dd3fc"
    : mortality > 1000
    ? "#e0f2fe"
    : "#f0f9ff";
};

const style = async (feature) => {
  const color = await getColor(feature.properties.name);

  return {
    fillColor: color,
    weight: 2,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.7,
  };
};

const renderCardData = (country) => {
  const defaultValues = {
    total_mortality: 0,
    male: 0,
    female: 0,
    age_group_5_to_14: 0,
    age_group_15_to_24: 0,
    age_group_25_to_34: 0,
    age_group_35_to_54: 0,
    age_group_55_to_74: 0,
    age_group_75_plus: 0,
  };

  const safeCountry = country || defaultValues;

  const total = Object.values(safeCountry)
    .filter((value) => typeof value === "number")
    .reduce((sum, value) => sum + value, 0);

  const calculatePercentage = (value) =>
    ((value / total) * 100).toFixed(2) || 0;

  const percentages = {
    male: calculatePercentage(safeCountry.male),
    female: calculatePercentage(safeCountry.female),
    age_group_5_to_14: calculatePercentage(safeCountry.age_group_5_to_14),
    age_group_15_to_24: calculatePercentage(safeCountry.age_group_15_to_24),
    age_group_25_to_34: calculatePercentage(safeCountry.age_group_25_to_34),
    age_group_35_to_54: calculatePercentage(safeCountry.age_group_35_to_54),
    age_group_55_to_74: calculatePercentage(safeCountry.age_group_55_to_74),
    age_group_75_plus: calculatePercentage(safeCountry.age_group_75_plus),
  };

  return `
    <header>
      <h1 class="title">${safeCountry.name === "All" ? "All Countries" : safeCountry.name || "N/A"}</h1>
      <span class="value">${safeCountry.total_mortality || "N/A"}</span>
    </header>
    <div class="content">
            <section class="sex">
                <h2>Sex</h2>
                ${renderGroup("Male", safeCountry.male, percentages.male)}
                ${renderGroup("Female", safeCountry.female, percentages.female)}
            </section>
      <section class="age">
        <h2>Age Groups</h2>
          ${Object.entries(percentages)
            .filter(([key]) => key.startsWith("age_group_"))
            .map(([key, percentage]) =>
              renderGroup(
                key.replace("age_group_", "").replace("_", "-") +
                  " Years",
                  safeCountry[key],
                  percentage
              )
            )
            .join("")} 
      </section>
    </div>
  `;
};

const renderGroup = (name, value, percentage) => `
  <div class="group">
    <div class="detail">
        <span class="name">${name}</span>
        <span class="value">${value || "N/A"}</span>
    </div>
    <div class="bar" id="${name.toLowerCase().replace(/\s+/g, "")}">
        <div class="percentage" style="width: ${percentage}%;"></div>
    </div>
  </div>
`;


legend.onAdd = function (map) {
  var div = L.DomUtil.create("div", "info legend"),
    grades = [
      0, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 750000,
    ],
    labels = [];

  for (var i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' +
      standardLegendColors(grades[i] + 1) +
      '"></i> ' +
      grades[i] +
      (grades[i + 1] ? "&ndash;" + grades[i + 1] + "<br>" : "+");
  }
  return div;
};

info.onAdd = function (map) {
  this._div = L.DomUtil.create("div", "data-column");
  this.update();
  return this._div;
};

info.update = async function (props) {
  const jsonUrl = "static/assets/json/data.json";

  if (props && props.name) {
    const country = await fetch(jsonUrl)
      .then((res) => res.json())
      .then((data) =>
        data.find(
          (country) =>
            country.name === props.name && country.year === selectedYear
        )
      )
      .catch((err) => console.error(`Error fetching data: ${err}...`));
    this._div.innerHTML = renderCardData(country);
  } else {
    const allCountriesData = await fetch(jsonUrl)
      .then((res) => res.json())
      .then((data) =>
        data.find(
          (country) => country.name === "All" && country.year === selectedYear
        )
      )
      .catch((err) => console.error(`Error fetching data: ${err}..`));
    this._div.innerHTML = renderCardData(allCountriesData);
  }
};

const loadDataToMap = (data) => {
  geoJson = L.geoJson(data, {
    style: style,
    onEachFeature: onEachFeature,
  });
  geoJson.addTo(map);
};

const fetchMapData = async (jsonUrl) => {
  try {
    const res = await fetch(jsonUrl);

    if (!res.ok) {
      console.error("Error fetching GeoJson data...");
      return null;
    }

    const data = await res.json();
    loadDataToMap(data);
  } catch (err) {
    console.error(err);
  }
};

const updateMap = async () => {
  geoJson.eachLayer(async function (layer) {
    const color = await getColor(layer.feature.properties.name);
    layer.setStyle({ fillColor: color });
  });

  info.update();
};

const handleYearUpdate = (event) => {
  const year = event.target.value;
  console.log(`Selected Year: ${year}`);
  selectedYear = year;
  updateMap();
};

const setupMap = () => {
  map.setView([0, 0], 2);

  map.zoomControl.setPosition("bottomleft");

  tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  info.addTo(map);

  fetchMapData("static/assets/json/map.json");

  legend.setPosition("topleft");

  legend.addTo(map);

  attachInputHandlerById("year-slider", handleYearUpdate);
};

setupMap();