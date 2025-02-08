const API_URL = "/api/gemini";

// State management
let isLoading = false;
let conversationHistory = [];

// Enhanced error handling
function showError(message, targetElement) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.setAttribute('role', 'alert');
  
  // Remove after 5 seconds
  setTimeout(() => errorDiv.remove(), 5000);
  
  if (targetElement) {
    targetElement.parentNode.insertBefore(errorDiv, targetElement.nextSibling);
  } else {
    // Default positioning
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
  }
}

// Image validation
function validateImage(file) {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  
  if (file.size > MAX_SIZE) {
    showError('file size exceeds 5MB limit', elements.imageUpload);
    return false;
  }
  
  if (!file.type.startsWith('image/')) {
    showError('file must be an image', elements.imageUpload);
    return false;
  }
  
  return true;
}

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

// Enhanced preset button creation
function updatePromptPresetButtons() {
  elements.presetButtons.innerHTML = "";

  const presets = JSON.parse(localStorage.getItem("prompt_presets") || "{}");
  const selectedPreset = localStorage.getItem("selected_prompt_preset");
  
  Object.entries(presets).forEach(([name, preset]) => {
    const button = document.createElement("button");
    button.className = "preset-button";
    button.textContent = name; // Instead of innerHTML
    button.onclick = () => loadPromptPreset(name);

    if (name === selectedPreset) {
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
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  const validImageItems = Array.from(items).filter(item => item.type.indexOf("image") !== -1);
  
  if (validImageItems.length === 0) return;
  
  // Create a new DataTransfer object
  const dataTransfer = new DataTransfer();
  
  // Add existing files if any
  if (elements.imageUpload.files.length > 0) {
    Array.from(elements.imageUpload.files).forEach(file => {
      dataTransfer.items.add(file);
    });
  }
  
  // Add all pasted images
  for (const item of validImageItems) {
    const blob = item.getAsFile();
    if (blob && validateImage(blob)) {
      dataTransfer.items.add(blob);
    }
  }
  
  // Update the input's files
  elements.imageUpload.files = dataTransfer.files;
  handleMultipleImageFiles(Array.from(dataTransfer.files));
});

// Enhanced image preview handling
function handleMultipleImageFiles(files) {
  elements.previewImages.innerHTML = "";

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
          
          // Add click to expand functionality
          img.addEventListener("click", () => {
            const modal = document.createElement("div");
            modal.classList.add("image-modal");
            modal.innerHTML = `<img src="${e.target.result}" alt="Expanded preview">`;
            document.body.appendChild(modal);
            
            modal.addEventListener("click", () => modal.remove());
          });

          const removeBtn = document.createElement("button");
          removeBtn.textContent = "×";
          removeBtn.classList.add("remove-image-btn");
          removeBtn.addEventListener("click", () => {
            imgWrapper.remove();
            const updatedFiles = Array.from(elements.imageUpload.files).filter(
              (f) => f !== file
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

    alert("all data has been cleared. The page will now reload.");
    window.location.reload();
  }
}

// Enhanced submit handling
async function handleSubmit(isFollowup = false) {
  const button = isFollowup ? elements.followupBtn : elements.submitBtn;
  const prompt = isFollowup ? elements.followupPrompt.value : elements.systemPrompt.value;

  if (!isFollowup && elements.imageUpload.files.length === 0) {
    showError('please upload at least one image', elements.imageUpload);
    return;
  }

  if (!prompt.trim()) {
    showError('please enter a prompt', isFollowup ? elements.followupPrompt : elements.systemPrompt);
    return;
  }

  let timeInterval;
  try {
    isLoading = true;
    button.disabled = true;
    document.body.style.cursor = 'wait';

    const startTime = performance.now();
    button.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <span>processing... (0s)</span>
      </div>
    `;

    // Update processing time
    timeInterval = setInterval(() => {
      const seconds = Math.round((performance.now() - startTime) / 1000);
      button.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>processing... (${seconds}s)</span>
        </div>
      `;
    }, 1000);

    let payload;
    if (isFollowup) {
      const previousResponse = elements.responseContent.textContent;
      const followupPrompt = `Previous response:\n${previousResponse}\n\nFollow-up question:\n${prompt}`;
      
      payload = {
        contents: {
          role: "user",
          parts: [{ text: elements.systemPrompt.value + "\n\n" + followupPrompt }],
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
        showError('please upload at least one image', elements.imageUpload);
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
      // Sanitize and format the response
      const sanitizedResponse = DOMPurify.sanitize(rawResponse);
      const formattedResponse = marked.parse(sanitizedResponse);

      elements.responseContent.innerHTML = formattedResponse;
      elements.responseContent.closest('.response-section').classList.add('visible');
      
      // Store the response in conversation history
      conversationHistory.push({
        role: "assistant",
        parts: [{ text: rawResponse }],
      });

      // Add copy button
      addCopyButton();
    } else {
      throw new Error("no candidates in api response");
    }
  } catch (error) {
    console.error("detailed error:", error);
    showError(error.message || 'an error occurred while processing your request', button);
  } finally {
    if (timeInterval) {
      clearInterval(timeInterval);
    }
    isLoading = false;
    button.disabled = false;
    document.body.style.cursor = 'default';
    button.innerHTML = isFollowup ? "send follow-up" : "get response";
    if (isFollowup) elements.followupPrompt.value = "";
  }
}

// Add copy functionality
function addCopyButton() {
  // Remove existing copy button if any
  const existingBtn = elements.responseContent.parentNode.querySelector('.copy-button');
  if (existingBtn) existingBtn.remove();

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-button';
  copyBtn.textContent = 'copy response';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(elements.responseContent.innerText);
      copyBtn.textContent = 'copied!';
      setTimeout(() => copyBtn.textContent = 'copy response', 2000);
    } catch (err) {
      showError('failed to copy response', elements.responseContent);
    }
  });
  elements.responseContent.parentNode.appendChild(copyBtn);
}

// Initialize event listeners
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
      if (validateImage(file)) {
        dataTransfer.items.add(file);
      }
    });
    
    // Update the input's files
    elements.imageUpload.files = dataTransfer.files;
    
    handleMultipleImageFiles(dataTransfer.files);
  });

  elements.submitBtn.addEventListener("click", () => handleSubmit(false));
  elements.followupBtn.addEventListener("click", () => handleSubmit(true));

  // Add event listener for file input change
  elements.imageUpload.addEventListener("change", (e) => {
    const files = e.target.files;
    handleMultipleImageFiles(files);
  });

  // Add event listener for "Choose Files" button
  if (elements.fileInputButton) {
    elements.fileInputButton.addEventListener("click", () => {
      elements.imageUpload.click();
    });
  }

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (document.activeElement === elements.systemPrompt) {
        handleSubmit(false);
      } else if (document.activeElement === elements.followupPrompt) {
        handleSubmit(true);
      }
    }
  });

  // Add Enter key handler for follow-up textarea
  elements.followupPrompt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handleSubmit(true);
    }
  });

  // Add clear all images button handler
  document.getElementById("clear-all-images").addEventListener("click", () => {
    elements.imageUpload.value = "";
    elements.previewImages.innerHTML = "";
    elements.previewImages.style.display = "none";
  });
}

// Initialize
initTheme();
initializePromptPresets(); // Add this line
initializeEventListeners();

// UI/UX enhancements: drag-and-drop visual feedback and file upload spinner

elements.dragDropArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    elements.dragDropArea.classList.add('dragover');
});

elements.dragDropArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    elements.dragDropArea.classList.remove('dragover');
});

elements.dragDropArea.addEventListener('drop', function(e) {
    e.preventDefault();
    elements.dragDropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
      e.dataTransfer.clearData();
    }
});

elements.imageUpload.addEventListener('change', function(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
});

function handleFiles(files) {
    const spinner = document.getElementById('upload-spinner');
    spinner.classList.remove('hidden');
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (validateImage(file)) {
            // Use existing preview function if available or add your preview logic here
            if (typeof addImagePreview === 'function') {
              addImagePreview(file);
            }
        }
    }
    
    // Simulate processing delay then hide spinner
    setTimeout(() => {
        spinner.classList.add('hidden');
    }, 1000);
}
