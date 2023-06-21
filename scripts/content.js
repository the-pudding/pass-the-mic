const visPadding = 16;
const minWidth = 160;

const speakers = new Map();
const speakerNodes = new Map();
const debug = true;
const base = "pass-the-mic";

let settings;
let threshold = 0;
let nameYou = "You";
let captionsButtonEl;
let captionsContainerEl;

function setStorage(key, value) {
  window.localStorage.setItem(`${base}-${key}`, value);
}

function getStorage(key) {
  return window.localStorage.getItem(`${base}-${key}`);
}

// async function getStorage(key) {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.storage.local.get(key, (value) => resolve(value[key]));
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

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
  const w =
    document.querySelector(".ptm-vis").getBoundingClientRect().width -
    visPadding;

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

function updateNumSpeakers() {
  const total = document.querySelectorAll("[data-self-name]").length;
  const fac = d3.selectAll(".speaker.facilitator").size();
  const numSpeakers = total - fac;
  threshold = (1 / numSpeakers) * 1.5;
}

function toggleFacilitator() {
  const value = d3.select(this).classed("facilitator");
  d3.select(this).classed("facilitator", !value);
  updateNumSpeakers();
}

function highlight(d) {
  if (d3.select(this).classed("facilitator")) return false;
  if (d.key === "Others") return false;
  return d.percent >= threshold;
}

function updateVis() {
  const data = prepareData();

  const speakerEnter = (enter) => {
    const speaker = enter.append("div");

    speaker.attr("class", "speaker").attr("aria-role", "button");

    speaker.append("div").attr("class", "bar");

    speaker.style("width", (d) => d3.format(".1%")(d.percent));

    const label = speaker.append("p").attr("class", "label text-outline");

    label
      .append("span")
      .attr("class", "name")
      .text((d) => (d.name === "You" ? nameYou : d.name));

    const percent = label.append("span").attr("class", "percent").text("0%");
    percent.text((d) => d3.format(".0%")(d.percent));

    speaker.on("click", toggleFacilitator);
    return speaker;
  };

  const joined = d3
    .select(".ptm-vis")
    .selectAll(".speaker")
    .data(data, (d) => d.key)
    .join(speakerEnter);

  joined
    .classed("highlight", highlight)
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
  updateNumSpeakers();
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

function updateOptions() {
  const opts = {};
  settings.forEach((key) => {
    const value = getStorage(key);
    opts[key] = value;
    console.log({ key, value });
  });

  console.log(opts);

  const visEl = document.querySelector(".ptm-vis");

  const { display } = window.getComputedStyle(captionsContainerEl);

  d3.select(captionsContainerEl).style(
    "opacity",
    opts.captions === "true" ? 1 : 0
  );

  if (opts.enable === "true") {
    if (display == "none" && captionsButtonEl) captionsButtonEl.click();
    if (!visEl) observeCaptions();
  } else {
    // if we were previously running it AND captions are visible, hide them
    if (visEl && display !== "none") {
      if (captionsButtonEl) captionsButtonEl.click();
      d3.select(".ptm-vis").remove();
    }
    // TODO disconnect observer
  }
}

// function storageChanged(changes) {
//   for (let [key, { newValue }] of Object.entries(changes)) {
//     options[key.replace(base, "")] = newValue;
//   }
//   updateOptions();
// }

function observeCaptions() {
  const visEl = document.createElement("div");
  visEl.classList.add("ptm-vis");
  document.body.appendChild(visEl);

  getYouName();
  // TODO hide captions (if option enabled)

  const el = captionsContainerEl.childNodes[0].childNodes[0];
  const config = { attributes: false, childList: true, subtree: false };
  const observer = new MutationObserver(handlePersonChange);
  observer.observe(el, config);
}

function toggleOptions() {
  const el = ".ptm-popup .options";
  d3.select(el).classed("active", !d3.select(el).classed("active"));
}

function createPopup() {
  const margin = 8;
  const outer = 96;
  const w = outer - margin;
  const w1 = w - 24;
  const w2 = w - 16;

  const popup = d3.select("body").append("div").attr("class", "ptm-popup");

  const btn = popup
    .append("button")
    .attr("class", "icon")
    .on("click", toggleOptions);

  btn.append("span").attr("class", "text-outline").text("🎤");

  const svg = btn.append("svg").attr("width", "100%").attr("height", "100%");

  const g = svg
    .append("g")
    .attr("transform", `translate(${outer / 2}, ${outer / 2})`);

  const above = g.append("g").attr("class", "above");
  above
    .append("path")
    .attr("id", "text-arc-above")
    .attr("d", `M -${w1 / 2} 0 A ${w1 / 2} ${w1 / 2} 0 0 1 ${w1 / 2} 0`);

  const below = g.append("g").attr("class", "below");

  below
    .append("path")
    .attr("id", "text-arc-below")
    .attr("d", `M -${w2 / 2} 0 A ${w2 / 2} ${w2 / 2} 0 0 0 ${w2 / 2} 0`);

  above
    .append("text")
    .append("textPath")
    .attr("xlink:href", "#text-arc-above")
    .style("text-anchor", "middle")
    .attr("startOffset", "50%")
    .text("Pass The Mic");

  below
    .append("text")
    .append("textPath")
    .attr("xlink:href", "#text-arc-below")
    .style("text-anchor", "middle")
    .attr("startOffset", "50%")
    .text("OPTIONS");

  above.attr("transform", "translate(0, 0)");
  below.attr("transform", "translate(0, 6)");

  const options = popup.append("div").attr("class", "options").html(`
		<section id="intro">
			<h2>Pass The Mic</h2>
			<p class="description">Visualize how much each person is talking in Google Meet</p>
		</section>
		
		<section id="settings">
			<fieldset>
				<legend>Settings</legend>
				<div>
					<input type="checkbox" id="enable" checked>
					<label for="enable">Enable</label>
				</div>
				<div>
					<input type="checkbox" id="captions">
					<label for="captions">Show captions</label>
				</div>
			</fieldset>
		</section>

		<section id="credits">
			<p>By <a href="https://pudding.cool/author/russell-samora" target="_blank" rel="noreferrer">Russell Samora</a> for <a href="https://pudding.cool" target="_blank" rel="noreferrer">The
				Pudding</a>.</p>
		</section>
	`);

  options
    .append("button")
    .text("Close")
    .on("click", () => options.classed("active", false));

  settings = [...document.querySelectorAll(".ptm-popup .options input")].map(
    (input) => input.id
  );

  settings.forEach((key) => {
    const value = getStorage(key) === "true";
    document.getElementById(key).checked = value || false;
    document.getElementById(key).addEventListener("change", (e) => {
      console.log("change");
      setStorage(key, e.target.checked);
      updateOptions();
    });
  });
}

async function init(btn) {
  createPopup();

  captionsButtonEl = btn;
  captionsContainerEl = document.querySelector(".a4cQT");
  // chrome.storage.local.onChanged.addListener(storageChanged);

  updateOptions();
}

waitForElement("[aria-label='Turn on captions (c)']", init);
