const API_URL = "/api/gemini";

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
  previewImages: document.getElementById("preview-images"),
  systemPrompt: document.getElementById("system-prompt"),
  submitBtn: document.getElementById("submit-btn"),
  followupBtn: document.getElementById("followup-btn"),
  responseContent: document.getElementById("response-content"),
  followupPrompt: document.getElementById("followup-prompt"),
  savePromptPreset: document.getElementById("save-prompt-preset"),
  deletePromptPreset: document.getElementById("delete-prompt-preset"),
  presetButtons: document.querySelector(".preset-buttons"),
  factoryReset: document.getElementById("factory-reset"),
  fileInputButton: document.querySelector(".file-input-button"),
};

const DEFAULT_PROMPT_PRESETS = {
  "calorie guesser": {
    prompt: `You are an expert nutritional analysis AI, capable of estimating the calorie content of food items based on images provided. Your primary goal is to provide a reasonable calorie estimate along with an explanation of your reasoning. You should be cautious and conservative in your estimations, prioritizing accuracy within a reasonable range over precision to an exact number.

*Instructions:*

1. *Image Analysis:* Analyze the provided image(s) carefully, identifying all visible food items. Pay attention to their appearance, size, and any visible ingredients.
2. *Food Item Identification:* Accurately identify each food item. Use your knowledge base of common foods to make educated guesses if necessary. If an item is unclear, state this and indicate the uncertainty in your estimation.
3. *Quantity Estimation:* Estimate the serving size of each food item. Consider visual cues like standard portion sizes, relative proportions, and any visible container size. Be clear about how you are estimating portion size (e.g., "This looks like about one cup," or "This appears to be a 6-inch sandwich").
4. *Calorie Estimation:* Based on your identification and quantity estimation, provide an estimated calorie count for each identified food item. Use your internal database or knowledge of nutritional information to make these estimations. Use average values when possible and state your sources when necessary.
5. *Total Calorie Estimate:* Sum up the estimated calories for all identified items to provide a total estimated calorie count for the entire image.
6. *Reasoning Explanation:* Clearly explain your reasoning for each food item's calorie estimate, including your identification, portion size estimate, and any assumptions you made. Explain any uncertainty in your estimation.
7. *Conservative Approach:* Aim for conservative calorie estimates. When uncertain, err on the side of slightly underestimating, but state this when necessary.
8. *Format:* Present your response in a clear and organized manner. Include item-by-item estimates, the total estimate, and your detailed explanations.
9. *Output:* Your response should be in the following format:

   *Item Analysis:*
      - [Food Item 1]: Approximately [Portion Size] estimated to be [Calorie Estimate] calories. [Reasoning and Assumptions]
      - [Food Item 2]: Approximately [Portion Size] estimated to be [Calorie Estimate] calories. [Reasoning and Assumptions]
      ...

   *Total Estimate:* The total estimated calorie count for this image is approximately [Total Calorie Estimate] calories.

*Limitations:*

*   You cannot perform physical measurements. All estimates are based on visual cues only.
*   You do not have perfect knowledge of specific ingredients or preparation methods, so you may need to make assumptions (e.g., cooking oil amount, type of bread, sauces). State these assumptions clearly.
*   Your estimates will be approximate and may not be exact. You should communicate the uncertainties.
*   You cannot account for hidden ingredients or unusual preparation methods that are not visible in the image.
*   You are not a substitute for a qualified dietician or nutritionist. This is for estimation purposes only.
*   Do not provide medical or nutritional advice beyond basic calorie estimation.
*   You may request additional information if needed to make a more informed estimate.

*Example Response (for image of a burger with fries):*

   *Item Analysis:*
      - Burger: Approximately one standard-sized burger estimated to be 450 calories. This is assuming a standard beef patty, bun, slice of cheese, lettuce, tomato, and a small amount of condiments.
      - Fries: Approximately one small side of fries (estimated as about 1 cup) estimated to be 300 calories. I am assuming they are standard fried potato fries.

   *Total Estimate:* The total estimated calorie count for this image is approximately 750 calories.

Remember to provide clear, informative, and helpful responses based on the images you receive.`,
  },
  "pony diffusion": {
    prompt: `A stable diffusion prompt generator for the model Pony Diffusion, details it's prompts to the best of it's abilities, describing everything to the maximum. Always use pony diffusion prompting and nothing else, even when prompting for pictures, always use Pony Diffusion techniques to the fullest of your abilities.

The prompts are a mix of tags from danbooru, gelbooru or different booru tags, some natural language, and descriptors

This model supports a wide array of styles and aesthetics but provides an opinionated default prompt template that allows generation of high quality samples with no negative prompt and otherwise default settings

score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, just describe what you want, tag1, tag2`,
  },
  "quiz solver": {
    prompt: `act as an expert quiz and multiple-choice question solver. analyze the image containing quiz/test questions and provide:

    For each question:

    Q#: [Answer] (Confidence: High/Medium/Low)

    Quick Explanation:
    • Main reason for answer
    • Key concept/rule applied
    • Why other options are wrong (if multiple choice)

    Key Terms: *relevant terms*

    Watch out for:
    • Common mistakes
    • Question tricks`,
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

  // Load the selected preset's prompt into systemPrompt
  const selectedPresetName = localStorage.getItem("selected_prompt_preset");
  if (selectedPresetName) {
    loadPromptPreset(selectedPresetName);
  }
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
      if (blob) {
        // Create a new DataTransfer object
        const dataTransfer = new DataTransfer();

        // Add existing files if any
        if (elements.imageUpload.files.length > 0) {
          Array.from(elements.imageUpload.files).forEach((file) => {
            dataTransfer.items.add(file);
          });
        }

        // Add the new pasted file
        dataTransfer.items.add(blob);

        // Update the input's files
        elements.imageUpload.files = dataTransfer.files;

        handleMultipleImageFiles([blob]);
      }
      break;
    }
  }
});

// Handle multiple image uploads
const imageUpload = document.getElementById("image-upload");
const previewImages = document.getElementById("preview-images");

imageUpload.addEventListener("change", (event) => {
  const files = event.target.files;
  previewImages.innerHTML = ""; // Clear existing previews

  if (files.length > 0) {
    previewImages.style.display = "flex";
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgWrapper = document.createElement("div");
        imgWrapper.classList.add("image-wrapper");

        const img = document.createElement("img");
        img.src = e.target.result;
        img.alt = "Image Preview";
        img.classList.add("preview-image");

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "×";
        removeBtn.classList.add("remove-image-btn");
        removeBtn.addEventListener("click", () => {
          imgWrapper.remove();
          // Remove the corresponding file from the FileList
          const updatedFiles = Array.from(elements.imageUpload.files).filter(
            (f) => f !== file,
          );
          const dataTransfer = new DataTransfer();
          updatedFiles.forEach((f) => dataTransfer.items.add(f));
          elements.imageUpload.files = dataTransfer.files;
        });

        imgWrapper.appendChild(img);
        imgWrapper.appendChild(removeBtn);
        previewImages.appendChild(imgWrapper);
      };
      reader.readAsDataURL(file);
    });
  } else {
    previewImages.style.display = "none";
  }
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

// API interaction
async function makeApiCall(payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin", // add this
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API call failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
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

  // Only check for images if it's not a follow-up
  if (!isFollowup && elements.imageUpload.files.length === 0) {
    alert("Please upload at least one image");
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
      const files = Array.from(elements.imageUpload.files);
      if (files.length === 0) {
        alert("Please upload at least one image");
        return;
      }

      // Convert all files to base64
      const base64Images = await Promise.all(
        files.map((file) => fileToBase64(file)),
      );

      const inlineDataArray = base64Images.map((base64Image, index) => ({
        inlineData: {
          mimeType: files[index].type,
          data: base64Image.split(",")[1],
        },
      }));

      payload = {
        contents: [
          {
            parts: [{ text: prompt }, ...inlineDataArray],
          },
        ],
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
    
    // Create a new DataTransfer object
    const dataTransfer = new DataTransfer();
    
    // Add existing files if any
    if (elements.imageUpload.files.length > 0) {
      Array.from(elements.imageUpload.files).forEach(file => {
        dataTransfer.items.add(file);
      });
    }
    
    // Add the new dropped files
    const files = e.dataTransfer.files;
    Array.from(files).forEach(file => {
      dataTransfer.items.add(file);
    });
    
    // Update the input's files
    elements.imageUpload.files = dataTransfer.files;
    
    handleMultipleImageFiles(files);
  });

  elements.submitBtn.addEventListener("click", () => handleSubmit(false));
  elements.followupBtn.addEventListener("click", () => handleSubmit(true));

  // Add event listener for "Choose Files" button
  if (elements.fileInputButton) {
    elements.fileInputButton.addEventListener("click", () => {
      elements.imageUpload.click();
    });
  }

  // Add keyboard support
  elements.dragDropArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elements.imageUpload.click();
    }
  });
}

// Function to handle multiple image files from drag-and-drop or "Choose Files"
function handleMultipleImageFiles(files) {
  elements.previewImages.innerHTML = ""; // Clear existing previews

  if (files.length > 0) {
    elements.previewImages.style.display = "flex";
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imgWrapper = document.createElement("div");
          imgWrapper.classList.add("image-wrapper");

          const img = document.createElement("img");
          img.src = e.target.result;
          img.alt = "Image Preview";
          img.classList.add("preview-image");

          const removeBtn = document.createElement("button");
          removeBtn.textContent = "×";
          removeBtn.classList.add("remove-image-btn");
          removeBtn.addEventListener("click", () => {
            imgWrapper.remove();
            // Remove the corresponding file from the FileList
            const updatedFiles = Array.from(elements.imageUpload.files).filter(
              (f) => f !== file,
            );
            const dataTransfer = new DataTransfer();
            updatedFiles.forEach((f) => dataTransfer.items.add(f));
            elements.imageUpload.files = dataTransfer.files;
          });

          imgWrapper.appendChild(img);
          imgWrapper.appendChild(removeBtn);
          elements.previewImages.appendChild(imgWrapper);
        };
        reader.readAsDataURL(file);
      }
    });
  } else {
    elements.previewImages.style.display = "none";
  }
}

// Initialize
initTheme();
initializePromptPresets(); // Add this line
initializeEventListeners();
