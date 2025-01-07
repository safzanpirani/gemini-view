const API_URL = "/api/gemini";
// "https://generativelanguage.googleapis.com/v1beta/models/gemini-exp-1206:generateContent";

// State management
let isLoading = false;
let conversationHistory = [];

marked.setOptions({
  breaks: true, // line breaks
  gfm: true, // github flavored markdown
  headerIds: false, // disable header IDs
  mangle: false, // disable header ID mangling
});

// DOM elements
const elements = {
  temperatureInput: document.getElementById("temperature"),
  temperatureValue: document.getElementById("temperature-value"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.querySelector(".theme-icon"),
  imageUpload: document.getElementById("image-upload"),
  dragDropArea: document.querySelector(".drag-drop-area"),
  previewImage: document.getElementById("preview-image"),
  systemPrompt: document.getElementById("system-prompt"),
  submitBtn: document.getElementById("submit-btn"),
  followupBtn: document.getElementById("followup-btn"),
  responseContent: document.getElementById("response-content"),
  followupPrompt: document.getElementById("followup-prompt"),
  savePromptPreset: document.getElementById("save-prompt-preset"),
  deletePromptPreset: document.getElementById("delete-prompt-preset"),
  presetButtons: document.querySelector(".preset-buttons"),
  factoryReset: document.getElementById("factory-reset"),
};

const DEFAULT_PROMPT_PRESETS = {
  "hinge response": {
    prompt: `you are a witty and humorous dating app assistant that always writes in lowercase, specializing in crafting engaging responses to hinge profiles. you're helping a 22m looking for meaningful connections with women. your task is to generate at least 4 different witty, funny, and slightly cheeky responses that blend silly/sarcastic vibes and flirty undertones. your responses should:

1. always be in lowercase
2. reflect gen z humor – often self-deprecating, slightly absurd
3. use internet slang where appropriate (but don't be try-hard)
4. be concise and punchy
5. aim to hook the other person into responding back
6. almost never include emojis
7. maintain a flirtiness level of 6-7/10
8. be relationship-oriented rather than hookup-focused

format each response on a new line starting with a bullet point (•). keep it casual but clever.`,
  },
  "pony diffusion": {
    prompt: `A stable diffusion prompt generator for the model Pony Diffusion, details it's prompts to the best of it's abilities, describing everything to the maximum. Always use pony diffusion prompting and nothing else, even when prompting for pictures, always use Pony Diffusion techniques to the fullest of your abilities.

The prompts are a mix of tags from danbooru, gelbooru or different booru tags, some natural language, and descriptors

This model supports a wide array of styles and aesthetics but provides an opinionated default prompt template that allows generation of high quality samples with no negative prompt and otherwise default settings

score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, just describe what you want, tag1, tag2`,
  },
  "quiz solver": {
    prompt: `act as an expert quiz and multiple-choice question solver. analyze the image containing quiz/test questions and provide:

  1. clear answers with explanations
  2. step-by-step reasoning for each answer
  3. keywords or concepts that led to the answer
  4. elimination process for incorrect options (if multiple choice)
  5. relevant formulas or rules used (if applicable)
  6. common tricks or traps to watch out for
  7. memory aids or mnemonics (when helpful)
  8. related concepts for deeper understanding

  format guidelines:
  • for each question, start with "Q#:" followed by the correct answer
  • use "explanation:" to provide detailed reasoning
  • if multiple choice, explain why other options are incorrect
  • highlight key terms in *asterisks*
  • include confidence level (high/medium/low) for each answer
  • mark uncertain answers with "?" and explain why

  example format:
  Q1: B (confidence: high)
  explanation: chosen because... [reasoning]
  wrong options:
  A - incorrect because...
  C - incorrect because...
  D - incorrect because...
  key concepts: *term1*, *term2*

  remember, the goal is not just to provide answers but to explain the thinking process and reinforce learning.`,
  },
};

// Add this function to initialize prompt presets
function initializePromptPresets() {
  let presets = JSON.parse(localStorage.getItem("prompt_presets") || "{}");
  if (Object.keys(presets).length === 0) {
    presets = DEFAULT_PROMPT_PRESETS;
    localStorage.setItem("prompt_presets", JSON.stringify(presets));
  }
  updatePromptPresetButtons();
}

function updatePromptPresetButtons() {
  elements.presetButtons.innerHTML = "";

  const presets = JSON.parse(localStorage.getItem("prompt_presets") || "{}");
  Object.entries(presets).forEach(([name, preset]) => {
    const button = document.createElement("button");
    button.className = "preset-button";
    button.textContent = name;
    button.onclick = () => loadPromptPreset(name);

    if (name === localStorage.getItem("selected_prompt_preset")) {
      button.classList.add("active");
    }

    elements.presetButtons.appendChild(button);
  });
}

function savePromptPreset() {
  const name = prompt("enter preset name:");
  if (!name) return;

  const presets = JSON.parse(localStorage.getItem("prompt_presets") || "{}");
  presets[name] = {
    prompt: elements.systemPrompt.value,
  };

  localStorage.setItem("prompt_presets", JSON.stringify(presets));
  localStorage.setItem("selected_prompt_preset", name);
  updatePromptPresetButtons();
}

function loadPromptPreset(presetName) {
  const presets = JSON.parse(localStorage.getItem("prompt_presets") || "{}");
  const preset = presets[presetName];
  if (!preset) return;

  elements.systemPrompt.value = preset.prompt;
  localStorage.setItem("selected_prompt_preset", presetName);
  updatePromptPresetButtons();
}

function deletePromptPreset() {
  const selectedPreset = localStorage.getItem("selected_prompt_preset");
  if (!selectedPreset) return;

  if (confirm(`delete preset "${selectedPreset}"?`)) {
    const presets = JSON.parse(localStorage.getItem("prompt_presets") || "{}");
    delete presets[selectedPreset];
    localStorage.setItem("prompt_presets", JSON.stringify(presets));
    localStorage.removeItem("selected_prompt_preset");
    updatePromptPresetButtons();
  }
}

elements.systemPrompt.value = `you are a witty and humorous dating app assistant that always writes in lowercase, specializing in crafting engaging responses to hinge profiles. you're helping a 22m looking for meaningful connections with women. your task is to generate at least 4 different witty, funny, and slightly cheeky responses that blend silly/sarcastic vibes and flirty undertones. your responses should:

1. always be in lowercase
2. reflect gen z humor – often self-deprecating, slightly absurd
3. use internet slang where appropriate (but don't be try-hard)
4. be concise and punchy
5. aim to hook the other person into responding back
6. almost never include emojis
7. maintain a flirtiness level of 6-7/10
8. be relationship-oriented rather than hookup-focused

format each response on a new line starting with a bullet point (•). keep it casual but clever.`;

document.addEventListener("paste", async (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData)
    .items;

  for (const item of items) {
    if (item.type.indexOf("image") !== -1) {
      const blob = item.getAsFile();
      await handleImageFile(blob);
      break;
    }
  }
});

// Image upload handler
elements.imageUpload.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) handleImageFile(file);
});

// Loading spinner helper
function createLoadingSpinner() {
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  return spinner;
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", savedTheme);
  elements.themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", newTheme);
  elements.themeIcon.textContent = newTheme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("theme", newTheme);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

async function preparePayload(prompt, base64Image, isFollowup = false) {
  const file = elements.imageUpload.files[0];

  if (isFollowup && conversationHistory.length > 0) {
    conversationHistory.push({
      role: "user",
      parts: [{ text: prompt }],
    });
    return {
      contents: conversationHistory,
      generationConfig: {
        temperature: parseFloat(elements.temperatureInput.value),
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      },
    };
  } else {
    return {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Image.split(",")[1],
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: parseFloat(elements.temperatureInput.value),
      },
    };
  }
}

// Image handling
async function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    elements.previewImage.src = e.target.result;
    elements.previewImage.style.display = "block";

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    elements.imageUpload.files = dataTransfer.files;
  };
  reader.readAsDataURL(file);
  conversationHistory = []; // Clear history with new image
}

// API interaction
async function makeApiCall(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  return await response.json();
}

function factoryReset() {
  if (
    confirm(
      "Warning: This will permanently delete all your settings, presets, and stored data. This action cannot be undone. Are you sure you want to continue?",
    )
  ) {
    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear all cookies for this domain
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Clear cache if available
    if ("caches" in window) {
      caches.keys().then(function (names) {
        names.forEach(function (name) {
          caches.delete(name);
        });
      });
    }

    alert("All data has been cleared. The page will now reload.");
    window.location.reload();
  }
}

// Submit handlers
async function handleSubmit(isFollowup = false) {
  const button = isFollowup ? elements.followupBtn : elements.submitBtn;
  const prompt = isFollowup
    ? elements.followupPrompt.value
    : elements.systemPrompt.value;

  // Only check for image if it's not a follow-up
  if (!isFollowup && !elements.imageUpload.files[0]) {
    alert("Please upload an image");
    return;
  }

  if (!prompt.trim()) {
    alert("Please enter a prompt");
    return;
  }

  try {
    isLoading = true;
    button.disabled = true;

    const spinner = createLoadingSpinner();
    const loadingText = document.createTextNode("processing...");
    button.innerHTML = "";
    button.appendChild(spinner);
    button.appendChild(loadingText);

    let payload;
    if (isFollowup) {
      // For text-only follow-ups
      payload = {
        contents: {
          role: "user",
          parts: [{ text: elements.systemPrompt.value + "\n\n" + prompt }],
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
        generationConfig: {
          temperature: parseFloat(elements.temperatureInput.value),
        },
      };
    } else {
      const base64Image = await fileToBase64(elements.imageUpload.files[0]);
      payload = await preparePayload(prompt, base64Image, isFollowup);
    }

    console.log("Sending payload:", JSON.stringify(payload, null, 2));
    const data = await makeApiCall(payload);
    console.log("API response:", data);

    if (data.candidates && data.candidates.length > 0) {
      const rawResponse = data.candidates[0].content.parts[0].text;
      // ensure line breaks are preserved and converted properly
      const processedResponse = rawResponse
        .replace(/\n\n/g, "\n\n") // preserve paragraph breaks
        .replace(/•/g, "\n•") // handle bullet points
        .trim();

      const formattedResponse = marked.parse(processedResponse, {
        breaks: true, // enables line breaks without needing two spaces
        gfm: true, // enables GitHub-flavored markdown
      });

      elements.responseContent.innerHTML = formattedResponse;
    } else {
      throw new Error("no candidates in api response");
    }
  } catch (error) {
    console.error("Detailed error:", error);
    console.error("Error message:", error.message);
    elements.responseContent.textContent =
      "An error occurred while processing your request";
  } finally {
    isLoading = false;
    button.disabled = false;
    button.textContent = isFollowup ? "send follow-up" : "get response";
    if (isFollowup) elements.followupPrompt.value = "";
  }
}

// Event listeners
function initializeEventListeners() {
  elements.temperatureInput.addEventListener("input", () => {
    elements.temperatureValue.textContent = elements.temperatureInput.value;
  });

  elements.savePromptPreset.addEventListener("click", savePromptPreset);
  elements.deletePromptPreset.addEventListener("click", deletePromptPreset);

  elements.themeToggle.addEventListener("click", toggleTheme);

  elements.factoryReset.addEventListener("click", factoryReset);

  elements.dragDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    elements.dragDropArea.classList.add("dragover");
  });

  elements.dragDropArea.addEventListener("dragleave", () => {
    elements.dragDropArea.classList.remove("dragover");
  });

  elements.dragDropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    elements.dragDropArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleImageFile(file);
  });

  elements.submitBtn.addEventListener("click", () => handleSubmit(false));
  elements.followupBtn.addEventListener("click", () => handleSubmit(true));

  // Add keyboard support
  elements.dragDropArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elements.imageUpload.click();
    }
  });
}

// Initialize
initTheme();
initializePromptPresets(); // Add this line
initializeEventListeners();
