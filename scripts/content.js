const primary = "#FF77AA";
const visPadding = 16;
const minWidth = 160;
const jargon = [
  "action plan",
  "actionable",
  "agile",
  "alignment",
  "all hands on deck",
  "analysis paralysis",
  "around the horn",
  "asap",
  "back to the drawing board",
  "balls in the air",
  "bandwidth",
  "bang for your buck",
  "bells and whistles",
  "best in class",
  "big bang for the buck",
  "bleeding edge",
  "blue ocean",
  "blue sky thinking",
  "boil the ocean",
  "brain dump",
  "buy in",
  "change agent",
  "circle back",
  "close of play",
  "core competency",
  "corporate culture",
  "corporate values",
  "customer centric",
  "deep dive",
  "deliverable",
  "disconnect",
  "do more with less",
  "double click",
  "drill down",
  "drink the kool aid",
  "ducks in a row",
  "ecosystem",
  "800 pound gorilla",
  "elephant in the room",
  "engagement",
  "frictionless",
  "game changer",
  "going forward",
  "growth hacking",
  "guru",
  "ideate",
  "ideation",
  "in the weeds",
  "key takeaway",
  "laser focused",
  "learnings",
  "lipstick on a pig",
  "lots of moving parts",
  "low hanging fruit",
  "make hay while the sun shines",
  "make it pop",
  "mission critical",
  "move the goal posts",
  "move the needle",
  "new normal",
  "ninja",
  "on my radar",
  "on the runway",
  "open the kimono",
  "organic growth",
  "out of pocket",
  "pain point",
  "par for the course",
  "paradigm shift",
  "peel the onion",
  "ping",
  "pivot",
  "price point",
  "proactive",
  "productize",
  "push the envelope",
  "roadmap",
  "run it up the flagpole",
  "run the numbers",
  "scalability",
  "scalable",
  "secret sauce",
  "skin in the game",
  "synergy",
  "take it offline",
  "take offline",
  "take this offline",
  "test the water",
  "30000 foot view",
  "thought leader",
  "thought leadership",
  "tiger team",
  "touch base",
  "trim the fat",
  "value add",
  "vertical",
  "win win",
  "window of opportunity",
];

const speakerNodes = new Map();
const debug = true;
const base = "pass-the-mic";
const refreshSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-ccw"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';

const shareSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

let speakers = new Map();
let jargonTracker = {};
let settings;
let threshold = 0;
let nameYou = "You";
let captionsButtonEl;
let captionsContainerEl;
let showJargon;

function setStorage(key, value) {
  window.localStorage.setItem(`${base}-${key}`, value);
}

function getStorage(key) {
  return window.localStorage.getItem(`${base}-${key}`);
}

function prepareData() {
  const all = [];

  for (let [key, captions] of speakers) {
    const splits = key.split("|");
    const name = splits[0];
    const count = d3.sum(
      Object.values(captions).map((d) => d.replace(/ /g, "").length)
    );
    all.push({ key, name, count });
  }

  const filtered = all.filter((d) => d.count > 0);

  const total = d3.sum(filtered.map((d) => d.count));
  const percents = filtered.map((d) => ({ ...d, percent: d.count / total }));

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
  const ignoreCount = d3.selectAll(".speaker.ignore").size();
  const numSpeakers = total - ignoreCount;
  threshold = (1 / numSpeakers) * 1.5;
}

function toggleIgnore() {
  const value = d3.select(this).classed("ignore");
  d3.select(this).classed("ignore", !value);
  updateNumSpeakers();
}

function highlight(d) {
  if (d3.select(this).classed("ignore")) return false;
  if (d.key === "Others") return false;
  return d.percent >= threshold;
}

function renderVis() {
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

    speaker.on("click", toggleIgnore);
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

function renderJargon(id, index, terms) {
  terms.forEach((term) => {
    const key = `${id}${index}${term}`;
    const value = jargonTracker[key];
    if (!value) {
      jargonTracker[key] = true;
      const rot1 = Math.floor(
        Math.random() * 15 * (Math.random() < 0.5 ? 1 : -1)
      );
      const rot2 = Math.floor(
        Math.random() * 15 * (Math.random() < 0.5 ? 1 : -1)
      );
      const scale = 1 + Math.random() * 3;
      const left = 20 + Math.random() * 60;
      const top = 10 + Math.random() * 20;
      const fs = 14;
      d3.select("body")
        .append("p")
        .attr("class", "ptm-jargon text-outline")
        .text(term)
        .style("left", `${left}%`)
        .style("top", "100%")
        .style("font-size", `${fs}px`)
        .style("transform", `rotate(${rot1}deg)`)
        .transition()
        .ease(d3.easeLinear)
        .duration(3000)
        .style("top", `${top}%`)
        .style("opacity", 0)
        .style("transform", `scale(${scale}) rotate(${rot2}deg)`)
        .remove();
    }
  });
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

function cleanText(text) {
  // replace all non-alphanumeric characters with a space
  const a = text.toLowerCase().replace(/[^a-zA-Z0-9]/g, " ");
  return ` ${a} `;
}

function checkForJargon(text) {
  return jargon.filter((term) => text.includes(` ${term} `));
}

function handleTextChange(id, node) {
  let newJargon;

  node.parentNode.querySelectorAll("span").forEach((node) => {
    const index = +node.getAttribute("data-index");
    const text = cleanText(node.innerText);
    speakers.get(id)[index] = text;
    if (showJargon) {
      newJargon = checkForJargon(text);
      if (newJargon.length) renderJargon(id, index, newJargon);
    }
  });

  renderVis();
}

function setIndex(id, node) {
  const newIndex = speakers.get(id).length || 0;
  node.setAttribute("data-index", newIndex);
}

function handleSpeakerUpdate(id, mutationsList) {
  for (let mutation of mutationsList) {
    const type = mutation.type;
    const target = mutation.target;
    const addedNode = mutation.addedNodes[0];
    const nodeName = addedNode?.nodeName;

    if (addedNode && nodeName === "SPAN") {
      setIndex(id, addedNode);
      handleTextChange(id, target);
    } else if (addedNode && nodeName === "#text") {
      handleTextChange(id, target);
    } else if (type === "characterData") {
      handleTextChange(id, target.parentNode);
    }
  }
}

function observeSpeaker(el) {
  const imgNode = el.childNodes[0];
  const nameNode = el.childNodes[1];
  const speechNode = el.childNodes[2].childNodes[0];
  const name = nameNode.textContent;

  const suffix = imgNode.src.split("/").pop().replace(/\W/g, "");
  const id = `${name}|${suffix}`;

  const exists = speakers.has(id);

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
  });

  const visEl = document.querySelector(".ptm-vis");

  const { display } = window.getComputedStyle(captionsContainerEl);

  // enable
  if (opts.enable === "true") {
    if (display == "none" && captionsButtonEl) captionsButtonEl.click();
    if (!visEl) observeCaptions();
    d3.select(captionsButtonEl).attr("data-ptm", "true");

    d3.select(captionsButtonEl.parentNode).attr(
      "title",
      "Pass The Mic is enabled. Toggle caption visibility in the options."
    );
  } else {
    // if we were previously running it AND captions are visible, hide them
    if (visEl && display !== "none") {
      if (captionsButtonEl) captionsButtonEl.click();
      d3.select(".ptm-vis").remove();
    }
    d3.select(captionsButtonEl).attr("data-ptm", null);
    d3.select(captionsButtonEl.parentNode).attr("title", null);
    // TODO disconnect observer
  }

  // captions
  d3.select(captionsContainerEl).style(
    "opacity",
    opts.captions === "true" ? 1 : 0
  );

  // jargon
  showJargon = opts.jargon === "true";
}

function observeCaptions() {
  const visEl = document.createElement("div");
  visEl.classList.add("ptm-vis");
  document.body.appendChild(visEl);

  getYouName();

  const el = captionsContainerEl.childNodes[0].childNodes[0];
  const config = { attributes: false, childList: true, subtree: false };
  const observer = new MutationObserver(handlePersonChange);
  observer.observe(el, config);
}

function toggleOptions() {
  const el = ".ptm-popup .options";
  d3.select(el).classed("active", !d3.select(el).classed("active"));
}

function resetSpeakers() {
  // iterate through all speakers and reset their count value
  speakers.forEach((value, key) => {
    speakers.set(key, []);
  });
  jargonTracker = {};
  renderVis();
}

function createPopup() {
  const margin = 8;
  const outer = 96;
  const w = outer - margin;
  const w1 = w - 24;
  const w2 = w - 16;

  const popup = d3.select("body").append("div").attr("class", "ptm-popup");

  const buttons = popup.append("div").attr("class", "buttons");

  const btnOptions = buttons
    .append("button")
    .attr("class", "btn-options")
    .attr("aria-label", "Pass The Mic options")
    .on("click", toggleOptions);

  btnOptions.append("span").attr("class", "icon text-outline").text("🎤");
  btnOptions.append("span").attr("class", "label text-outline").text("options");

  const btnReset = buttons
    .append("button")
    .attr("class", "btn-reset")
    .attr("aria-label", "reset Pass The Mic")
    .on("click", resetSpeakers);

  btnReset.append("span").attr("class", "icon text-outline").html(refreshSvg);

  btnReset.append("span").attr("class", "label text-outline").text("reset");

  // const svg = btn.append("svg").attr("width", "100%").attr("height", "100%");

  // const g = svg
  //   .append("g")
  //   .attr("transform", `translate(${outer / 2}, ${outer / 2})`);

  // const above = g.append("g").attr("class", "above");
  // above
  //   .append("path")
  //   .attr("id", "text-arc-above")
  //   .attr("d", `M -${w1 / 2} 0 A ${w1 / 2} ${w1 / 2} 0 0 1 ${w1 / 2} 0`);

  // const below = g.append("g").attr("class", "below");

  // below
  //   .append("path")
  //   .attr("id", "text-arc-below")
  //   .attr("d", `M -${w2 / 2} 0 A ${w2 / 2} ${w2 / 2} 0 0 0 ${w2 / 2} 0`);

  // above
  //   .append("text")
  //   .append("textPath")
  //   .attr("xlink:href", "#text-arc-above")
  //   .style("text-anchor", "middle")
  //   .attr("startOffset", "50%")
  //   .text("Pass The Mic");

  // below
  //   .append("text")
  //   .append("textPath")
  //   .attr("xlink:href", "#text-arc-below")
  //   .style("text-anchor", "middle")
  //   .attr("startOffset", "50%")
  //   .text("OPTIONS");

  // above.attr("transform", "translate(0, 0)");
  // below.attr("transform", "translate(0, 6)");

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
				<div>
					<input type="checkbox" id="jargon">
					<label for="jargon">Highlight Jargon</label>
				</div>
			</fieldset>
		</section>

		<section id="howto">
			<h4><strong>Tips</strong></h4>
			<p>Click a person to ignore from speaker count.</p>
		</section>

		<section id="outro">
			<ul>
				<li><a href="https://github.com/the-pudding/pass-the-mic/issues" target="_blank" rel="noreferrer">Report a bug</a></li>
				<li><a href="https://github.com/the-pudding/pass-the-mic/issues?q=is%3Aissue+is%3Aopen+label%3Afeature" target="_blank" rel="noreferrer">Feature roadmap</a></li>
				<li><a href="mailto:russell@pudding.cool">Feature requests</a></li>
				<li>By <a href="https://pudding.cool/author/russell-samora" target="_blank" rel="noreferrer">Russell Samora</a> for <a href="https://pudding.cool" target="_blank" rel="noreferrer">The
					Pudding</a>.</li>				
			</ul>
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
      setStorage(key, e.target.checked);
      updateOptions();
    });
  });
}

async function init(btn) {
  createPopup();

  captionsButtonEl = btn;
  captionsContainerEl = document.querySelector(".a4cQT");

  updateOptions();
}

waitForElement("[aria-label='Turn on captions (c)']", init);
