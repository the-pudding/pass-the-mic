const visEl = document.createElement("div");

const speakers = new Map();
const barHeight = 36;
const margin = 4;

function updateVis() {
  const h = (barHeight + margin) * speakers.size;
  d3.select(visEl).style("height", `${h}px`);

  const all = [];

  for (let [key, captions] of speakers) {
    console.log(Object.values(captions));
    const name = key.split("|")[0];
    const count = d3.sum(Object.values(captions).map((d) => d.length));
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

function handleSpanText(id, node) {
  const index = node.getAttribute("data-index");
  const text = node.textContent;
  speakers.get(id)[index] = text;
  updateVis();
}

function observeSpan(id, node) {
  const config = {
    attributes: false,
    childList: true,
    subtree: true,
  };

  const newIndex = speakers.get(id).length || 0;
  node.setAttribute("data-index", newIndex);
  const observer = new MutationObserver(() => handleSpanText(id, node));
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

  if (!speakers.has(id)) speakers.set(id, {});

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
      // console.log("person change");
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

  captionsButton.click();

  // TODO hide captions (if option enabled)

  const el = document.querySelector(".a4cQT").childNodes[0].childNodes[0];
  const config = { attributes: false, childList: true, subtree: false };
  const observer = new MutationObserver(handlePersonChange);
  observer.observe(el, config);
}

waitForElement("[aria-label='Turn on captions (c)']", init);
