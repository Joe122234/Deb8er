document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("map-container");
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)  // ✅ responsive
        .attr("preserveAspectRatio", "xMidYMid meet") // ✅ no stretching
        .style("width", "100%")
        .style("height", "100%");

    const projection = d3.geoMercator();
    const path = d3.geoPath().projection(projection);

    const tooltip = d3.select("#map-tooltip");

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        .then(worldData => {

            const countries = topojson.feature(
                worldData,
                worldData.objects.countries
            ).features;

            // ✅ AUTO-FIT MAP TO CONTAINER
            projection.fitSize([width, height], {
                type: "FeatureCollection",
                features: countries
            });

            // Draw land
            svg.selectAll(".land")
                .data(countries)
                .enter()
                .append("path")
                .attr("class", "land")
                .attr("d", path);

            // Pins
            const pins = [
                // Europe / Global
                { name: "Online MUN", coords: [2.3522, 48.8566] },        // Paris
                { name: "Inclusivity", coords: [139.6917, 35.6895] },    // Tokyo
                { name: "Research Excellence", coords: [-74.0060, 40.7128] }, // New York
            
                // Asia
                { name: "Rising Delegates", coords: [96.1951, 16.8661] }, // Myanmar (Yangon)
                { name: "Debate Powerhouse", coords: [77.2090, 28.6139] }, // India (New Delhi)
                { name: "Policy Strategy", coords: [116.4074, 39.9042] }, // China (Beijing)
            
                // Europe / Africa
                { name: "Global Diplomacy", coords: [37.6173, 55.7558] }, // Russia (Moscow)
                { name: "Youth Leadership", coords: [31.2357, 30.0444] }, // Egypt (Cairo)
                { name: "Policy Innovation", coords: [18.4241, -33.9249] }, // South Africa (Cape Town)
            
                // Americas
                { name: "Become Better Deb8ers", coords: [-79.3832, 43.6532] }, // Canada (Toronto)
                { name: "Regional Cooperation", coords: [-99.1332, 19.4326] },  // Mexico (Mexico City)
                { name: "Emerging Voices", coords: [-46.6333, -23.5505] },      // Brazil (São Paulo)
            
                // Oceania
                { name: "Future Negotiators", coords: [151.2093, -33.8688] }    // Australia (Sydney)
            ];
            

            svg.selectAll(".pin")
                .data(pins)
                .enter()
                .append("circle")
                .attr("class", "pin")
                .attr("r", 6)
                .attr("cx", d => projection(d.coords)[0])
                .attr("cy", d => projection(d.coords)[1])
                .on("mouseover", (event, d) => {
                    tooltip
                        .style("opacity", 1)
                        .style("left", event.pageX + "px")
                        .style("top", event.pageY - 40 + "px")
                        .html(d.name);
                })
                .on("mouseout", () => {
                    tooltip.style("opacity", 0);
                });
        });
});


const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const icon = navToggle.querySelector("i");

navToggle.addEventListener("click", () => {
  navLinks.classList.toggle("active");

  if (navLinks.classList.contains("active")) {
    icon.classList.remove("fa-bars");
    icon.classList.add("fa-xmark");
  } else {
    icon.classList.remove("fa-xmark");
    icon.classList.add("fa-bars");
  }
});



const track = document.querySelector('.skills-track');
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');
const cards = document.querySelectorAll('.skill-card');

let cardWidth = cards[0].offsetWidth + 30; // card width + gap
let currentPosition = 0;

// Update cardWidth on resize for responsiveness
window.addEventListener('resize', () => {
    cardWidth = cards[0].offsetWidth + 30;
});

// Next button
nextBtn.addEventListener('click', () => {
    if (Math.abs(currentPosition) < (track.scrollWidth - track.parentElement.offsetWidth)) {
        currentPosition -= cardWidth;
        track.style.transform = `translateX(${currentPosition}px)`;
    }
});

// Previous button
prevBtn.addEventListener('click', () => {
    if (currentPosition < 0) {
        currentPosition += cardWidth;
        track.style.transform = `translateX(${currentPosition}px)`;
    }
});



window.addEventListener("load", () => {
    AOS.init({
      once: true,
      duration: 900,
      easing: "ease-out-cubic"
    });
  
    setTimeout(() => {
      document.body.classList.add("loaded");
      AOS.refresh();
    }, 2000);
  });
  window.addEventListener("load", () => {
    // match your loader duration
    const LOADER_DURATION = 1000;
  
    setTimeout(() => {
      const heroItems = document.querySelectorAll(".hero-animate");
  
      heroItems.forEach((el, i) => {
        setTimeout(() => {
          el.classList.add("is-visible");
        }, i * 150); // stagger
      });
    }, LOADER_DURATION);
  });
  

  document.addEventListener("DOMContentLoaded", () => {
    const emailLink = document.getElementById("copy-email");
    if (!emailLink) return; // ← THIS is why it only worked on index.html
  
    emailLink.addEventListener("click", (e) => {
      e.preventDefault();
  
      navigator.clipboard.writeText("hello.deb8er@gmail.com");
  
      const original = emailLink.textContent;
      emailLink.textContent = "Copied!";
      emailLink.style.color = "var(--cyan)";
  
      setTimeout(() => {
        emailLink.textContent = original;
        emailLink.style.color = "";
      }, 1500);
    });
  });
  