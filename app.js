const map = L.map("map").setView([54, -2], 6);
function getPinColour(phase) {

    let colour = "blue";

    if (phase.includes("Primary")) {
        colour = "green";
    }
    else if (phase.includes("Secondary")) {
        colour = "violet";
    }
    else if (phase.includes("All")) {
        colour = "orange";
    }

    return new L.Icon({
        iconUrl:
            `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${colour}.png`,
        shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25,41],
        iconAnchor:[12,41],
        popupAnchor:[1,-34]
    });

}

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(map);

const search = document.getElementById("search");
const phase = document.getElementById("phase");
const region = document.getElementById("region");
const count = document.getElementById("count");

fetch("schools.json")
    .then(r => r.json())
    .then(data => {

        const cluster = L.markerClusterGroup({
    disableClusteringAtZoom: 8
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

            const filtered = data.filter(d => {

                return (
                    (!phase.value || d["School Phase"] === phase.value) &&
                    (!region.value || d["Region"] === region.value) &&
                    (
                        !search.value ||
                        JSON.stringify(d)
                            .toLowerCase()
                            .includes(search.value.toLowerCase())
                    )
                );

            });

            count.innerHTML = `${filtered.length} schools`;

            const bounds = [];

           filtered.forEach(d => {

    const lat = Number(d["Latitude"]);
    const lng = Number(d["Longitude"]);

    console.log(
        d["Full Name"],
        lat,
        lng
    );

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
        Region:
        ${d["Region"]}
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

            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) *
                Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);

            const c =
                2 * Math.atan2(
                    Math.sqrt(a),
                    Math.sqrt(1 - a)
                );

            return (R * c) * 0.621371;
        }

        [search, phase, region].forEach(x => {
            x.oninput = render;
        });

        render();

        document
            .getElementById("findNearest")
            .onclick = async () => {

                const pc =
                    document
                        .getElementById("postcodeSearch")
                        .value
                        .trim();

                if (!pc) return;

                try {

                    const response = await fetch(
                        `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`
                    );

                    const result = await response.json();

                    if (!result.result) {
                        alert("Postcode not found");
                        return;
                    }

                    const near = data
                        .map(s => ({
                            ...s,
                            miles: distanceMiles(
                                result.result.latitude,
                                result.result.longitude,
                                parseFloat(s["Latitude"]),
                                parseFloat(s["Longitude"])
                            )
                        }))
                        .sort((a, b) => a.miles - b.miles)
                        .slice(0, 10);

                    const div =
                        document.getElementById(
                            "nearestResults"
                        );

                    div.innerHTML =
                        "<h4>Nearest Schools</h4>";

                    near.forEach((n, index) => {

    div.innerHTML += `
        <div class="result-item">

            ${index === 0 ? "⭐ " : ""}

            <b>${n["Full Name"]}</b>

            <br>

            ${n["School Phase"]}

            <br>

            ${n.miles.toFixed(1)} miles away

        </div>
    `;

});

                    if (near.length > 0) {

                        map.setView([
                            parseFloat(
                                near[0]["Latitude"]
                            ),
                            parseFloat(
                                near[0]["Longitude"]
                            )
                        ], 10);

                    }

                }
                catch (err) {

                    console.error(err);
                    alert(
                        "Unable to search postcode"
                    );

                }

            };

    });
