const visEl = document.createElement("div");
const pEl = document.createElement("p");
pEl.style.height = "640px";
pEl.style.overflow = "scroll";
pEl.style.padding = "8px";
pEl.style.zIndex = "99999";
pEl.style.position = "fixed";
pEl.style.top = "0";
pEl.style.left = "0";

const speakers = new Map();
const barHeight = 36;
const margin = 4;

function updateVis() {
  const h = (barHeight + margin) * speakers.size;
  d3.select(visEl).style("height", `${h}px`);

  const all = [];

  for (let [key, value] of speakers) {
    const name = key.split("|")[0];
    const count = d3.sum(value.map((d) => d.length));
    all.push({ key, name, count });
  }

  const total = d3.sum(all.map((d) => d.count));
  const percents = all.map((d) => ({ ...d, percent: d.count / total }));

  // sort by count
  percents.sort((a, b) => b.percent - a.percent);

  const speakerEnter = (enter) => {
    const speaker = enter.append("div");

    speaker.attr("class", "speaker");
    speaker.style("height", `${barHeight}px`);

    speaker
      .append("div")
      .attr("class", "label")
      .text((d) => d.name);

    const bar = speaker.append("div").attr("class", "bar");
    const inner = bar.append("div").attr("class", "inner");

    inner.append("span").attr("class", "percent").text("0%");

    return speaker;
  };

  const joined = d3
    .select(visEl)
    .selectAll(".speaker")
    .data(percents, (d) => d.key)
    .join(speakerEnter);

  joined
    .transition()
    .duration(500)
    .ease(d3.easeCubicInOut)
    .style("top", (d, i) => `${margin * 2 + (barHeight + margin) * i}px`);

  joined
    .select(".inner")
    .transition()
    .duration(500)
    .ease(d3.easeCubicInOut)
    .style("width", (d) => d3.format(".1%")(d.percent));

  joined.select(".percent").text((d) => d3.format(".0%")(d.percent));
}

function waitForElement(selector, callback, timeout = 1000) {
  const intervalId = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(intervalId);
      callback(element);
    }
  }, timeout);
}

function handleSpeak(id, speechEl) {
  if (!speakers.has(id)) speakers.set(id, []);
  speakers.set(id, [...speakers.get(id), speechEl.textContent]);
  // pEl.textContent = JSON.stringify([...speakers.get(id), speechEl.textContent]);
  updateVis();
}

let n = 0;

function handleSpanText(node) {
  console.log(node.getAttribute("data-index"), node.textContent);
}

function observeSpan(id, node) {
  const config = {
    attributes: false,
    childList: true,
    subtree: true,
  };

  // listen to first span
  node.setAttribute("data-index", n++);
  const observer = new MutationObserver(() => handleSpanText(node));
  observer.observe(node, config);
}

function handleNewSpan(id, mutationsList) {
  for (let mutation of mutationsList) {
    // console.log(mutation);
    if (mutation.addedNodes.length) {
      const node = mutation.addedNodes[0];
      observeSpan(id, node);
    }
  }
}

function observeSpeaker(el) {
  const imgEl = el.childNodes[0];
  const nameEl = el.childNodes[1];
  const speechEl = el.childNodes[2].childNodes[0];
  const name = nameEl.textContent;
  // replace non alphanumeric characters with nothing
  const suffix = imgEl.src.split("/").pop().replace(/\W/g, "");
  const id = `${name}|${suffix}`;

  const node = speechEl.childNodes[0];
  observeSpan(id, node);

  // listen for newly created spans
  const config = {
    attributes: false,
    childList: true,
    subtree: false,
  };
  const observer = new MutationObserver((mutationsList) =>
    handleNewSpan(id, mutationsList)
  );
  observer.observe(speechEl, config);
}

function handlePersonChange(mutationsList) {
  for (let mutation of mutationsList) {
    if (mutation.addedNodes.length) {
      console.log("person change");
      observeSpeaker(mutation.addedNodes[0]);
    }

    if (mutation.removedNodes.length) {
      // TODO
      console.log("removed", mutation.removedNodes.length);
    }
  }
}

function init(captionsButton) {
  visEl.classList.add("ptm-vis");
  document.body.appendChild(visEl);
  document.body.appendChild(pEl);

  captionsButton.click();

  // TODO hide captions (if option enabled)

  const el = document.querySelector(".a4cQT").childNodes[0].childNodes[0];
  const config = { attributes: false, childList: true, subtree: false };
  const observer = new MutationObserver(handlePersonChange);
  observer.observe(el, config);
}

waitForElement("[aria-label='Turn on captions (c)']", init);
