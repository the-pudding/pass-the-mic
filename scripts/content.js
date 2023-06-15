const visPadding = 16;
const minWidth = 128;
const visEl = document.createElement("div");

const speakers = new Map();
const speakerNodes = new Map();
const debug = true;

let numSpeakers = 0;
let threshold = 0;
let nameYou = "You";

function prepareData() {
  const all = [];

  for (let [key, captions] of speakers) {
    // console.log(Object.values(captions));
    const splits = key.split("|");
    const name = splits[0];
    const count = d3.sum(Object.values(captions).map((d) => d.length));
    all.push({ key, name, count });
  }

  const total = d3.sum(all.map((d) => d.count));
  const percents = all.map((d) => ({ ...d, percent: d.count / total }));

  // sort by count
  percents.sort((a, b) => b.percent - a.percent);

  // TODO min width
  const w = visEl.getBoundingClientRect().width - visPadding;

  const withWidth = percents.map((d) => ({
    ...d,
    width: d.percent * w,
  }));

  const withGroup = withWidth.map((d, i) => ({
    ...d,
    group: d.width > minWidth ? i : -1,
  }));

  const clean = d3
    .groups(withGroup, (d) => d.group)
    .map(([group, members]) => {
      if (group === -1)
        return {
          percent: d3.sum(members, (d) => d.percent),
          name: "Others",
          members,
        };
      return members[0];
    });

  return clean;
}

function updateVis() {
  const data = prepareData();

  // const ranked = percents.map((d, i) => ({ ...d, rank: i }));
  // if (debug) console.table(ranked);

  const speakerEnter = (enter) => {
    const speaker = enter.append("div");

    speaker.attr("class", "speaker");

    speaker.append("div").attr("class", "bar");

    speaker.style("width", (d) => d3.format(".1%")(d.percent));

    const label = speaker.append("p").attr("class", "label text-outline");

    label
      .append("span")
      .attr("class", "name")
      .text((d) => (d.name === "You" ? nameYou : d.name));

    const percent = label.append("span").attr("class", "percent").text("0%");
    percent.text((d) => d3.format(".0%")(d.percent));

    return speaker;
  };

  const joined = d3
    .select(visEl)
    .selectAll(".speaker")
    .data(data, (d) => d.key)
    .join(speakerEnter);

  joined
    .classed("highlight", (d) => d.percent >= threshold)
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

function handleTextChange(id, node) {
  node.parentNode.querySelectorAll("span").forEach((node) => {
    const index = +node.getAttribute("data-index");
    const text = node.innerText;
    // console.log({ fn: "handleTextChange", index, text });
    speakers.get(id)[index] = text;
  });

  updateVis();
}

function setIndex(id, node) {
  const newIndex = speakers.get(id).length || 0;
  node.setAttribute("data-index", newIndex);
}

function handleSpeakerUpdate(id, mutationsList) {
  for (let mutation of mutationsList) {
    const type = mutation.type;
    // const node = mutation.addedNodes[0];
    const target = mutation.target;
    const addedNode = mutation.addedNodes[0];
    const nodeName = addedNode?.nodeName;
    // const removedNode = mutation.removedNodes[0];
    // const removedNodeName = removedNode?.nodeName;

    // console.log({ type, nodeName, target, addedNode });

    if (addedNode && nodeName === "SPAN") {
      setIndex(id, addedNode);
      handleTextChange(id, target);
    } else if (addedNode && nodeName === "#text") {
      handleTextChange(id, target);
    } else if (type === "characterData") {
      handleTextChange(id, target.parentNode);
    }

    // if (mutation.removedNodes.length > 0) {
    //   console.log("removedNodes", mutation.removedNodes[0]);
    // }
  }
}

function observeSpeaker(el) {
  const imgNode = el.childNodes[0];
  const nameNode = el.childNodes[1];
  const speechNode = el.childNodes[2].childNodes[0];
  const name = nameNode.textContent;
  // replace non alphanumeric characters with nothing
  const suffix = imgNode.src.split("/").pop().replace(/\W/g, "");
  const id = `${name}|${suffix}`;

  const exists = speakers.has(id);

  // if (debug) console.log({ fn: "observerSpeaker", id, exists });

  if (!exists) speakers.set(id, []);

  const node = speechNode.childNodes[0];

  if (node) {
    setIndex(id, node);
    handleTextChange(id, node);
  }

  // listen for future spans
  const config = {
    attributes: false,
    childList: true,
    subtree: true,
    characterData: true,
  };

  const observer = new MutationObserver((mutationsList) => {
    handleSpeakerUpdate(id, mutationsList);
    if (!document.contains(speechNode)) observer.disconnect();
  });

  observer.observe(speechNode, config);
}

function updateSpeakers() {
  // const videos = document.querySelectorAll("[data-layout]");
  // videos.forEach((video) => {
  //   const name = video
  //     .querySelector("[data-self-name]")
  //     .getAttribute("data-self-name");
  //   const suffix = video
  //     .querySelector("img")
  //     .getAttribute("src")
  //     .split("/")
  //     .pop()
  //     .replace(/\W/g, "");
  //   const id = `${name}|${suffix}`;
  //   const exists = speakers.has(id);
  //   if (!exists) speakers.set(id, []);
  //   console.log(id);
  // });
  numSpeakers = document.querySelectorAll("[data-self-name]").length;
  threshold = (1 / numSpeakers) * 1.5;
  // console.log(numSpeakers);
}

function handlePersonChange(mutationsList) {
  updateSpeakers();

  for (let mutation of mutationsList) {
    if (mutation.addedNodes.length) {
      observeSpeaker(mutation.addedNodes[0]);
    }

    if (mutation.removedNodes.length) {
      // console.log("removed", mutation.removedNodes[0]);
    }
  }
}

function getYouName() {
  const el = document.querySelector("#yDmH0d");
  const html = el?.innerHTML || "";
  const a = html.split('","https://accounts.google.com/AccountChooser')[0];
  nameYou = a ? a.substring(a.lastIndexOf('"') + 1, a.length) : "You";
}

function init(captionsButton) {
  visEl.classList.add("ptm-vis");
  document.body.appendChild(visEl);

  captionsButton.click();

  getYouName();
  // TODO hide captions (if option enabled)

  const el = document.querySelector(".a4cQT").childNodes[0].childNodes[0];
  const config = { attributes: false, childList: true, subtree: false };
  const observer = new MutationObserver(handlePersonChange);
  observer.observe(el, config);
}

waitForElement("[aria-label='Turn on captions (c)']", init);
