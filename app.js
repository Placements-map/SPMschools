const map = L.map("map").setView([54, -2], 6);

function getPinColour(phase) {

    let colour = "blue";

    if (phase && phase.includes("Primary")) {
        colour = "green";
    }
    else if (phase && phase.includes("Secondary")) {
        colour = "violet";
    }
    else if (phase && phase.includes("All")) {
        colour = "orange";
    }

    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${colour}.png`,
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });
}

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap"
    }
).addTo(map);

const search = document.getElementById("search");
const phase = document.getElementById("phase");
const region = document.getElementById("region");
const count = document.getElementById("count");

fetch("schools.json")
    .then(r => r.json())
    .then(data => {

        const cluster = L.markerClusterGroup({
            disableClusteringAtZoom: 8,
            maxClusterRadius: 60
        });

        map.addLayer(cluster);

        [...new Set(data.map(x => x["School Phase"]))]
            .filter(Boolean)
            .sort()
            .forEach(v => {
                phase.innerHTML += `<option value="${v}">${v}</option>`;
            });

        [...new Set(data.map(x => x["Region"]))]
            .filter(Boolean)
            .sort()
            .forEach(v => {
                region.innerHTML += `<option value="${v}">${v}</option>`;
            });

        function render() {

            cluster.clearLayers();

            const filtered = data.filter(d =>
                (!phase.value || d["School Phase"] === phase.value) &&
                (!region.value || d["Region"] === region.value) &&
                (
                    !search.value ||
                    JSON.stringify(d)
                        .toLowerCase()
                        .includes(search.value.toLowerCase())
                )
            );

            count.innerHTML = `${filtered.length} schools`;

            const bounds = [];

            filtered.forEach(d => {

                const lat = Number(d["Latitude"]);
                const lng = Number(d["Longitude"]);

                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    return;
                }

                const marker = L.marker(
                    [lat, lng],
                    {
                        icon: getPinColour(
                            d["School Phase"]
                        )
                    }
                );

                marker.bindPopup(`
                    <div style="
                        padding:10px;
                        min-width:220px;
                        font-family:Segoe UI,sans-serif;
                    ">
                        <h3 style="
                            margin:0 0 8px 0;
                            color:#5B2C83;
                        ">
                            ${d["Full Name"]}
                        </h3>

                        <div style="
                            font-weight:bold;
                            color:#00A3A3;
                            margin-bottom:8px;
                        ">
                            ${d["School Phase"]}
                        </div>

                        <div>
                            📍 ${d["Preferred Address Line 1"] || ""}
                        </div>

                        <div>
                            ${d["Preferred Town"] || ""}
                        </div>

                        <div>
                            ${d["Preferred Postcode"] || ""}
                        </div>

                        <hr>

                        <div>
                            Region: ${d["Region"]}
                        </div>
                    </div>
                `);

                cluster.addLayer(marker);

                bounds.push([lat, lng]);

            });

            if (bounds.length > 0) {
                map.fitBounds(bounds, {
                    padding: [30, 30]
                });
            }
        }

        function distanceMiles(lat1, lon1, lat2, lon2) {

            const R = 6371;

            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;

