const API_URL = "/api/gemini";

// State management
let isLoading = false;
let conversationHistory = [];

// Response Switcher functionality
let currentResponseIndex = -1;

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

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  toast.style.color = '#fff';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.zIndex = '10000';
  
  // Add animation classes
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(-50%) translateY(10px)';
  toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
  
  setTimeout(() => { 
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => { toast.remove(); }, 300);
  }, 3000);
}

// Image validation
function validateImage(file) {
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
  audioRecorder: document.getElementById("audio-recorder"),
  startRecording: document.getElementById("start-recording"),
  stopRecording: document.getElementById("stop-recording"),
  audioPlayer: document.getElementById("audio-player"),
  deleteRecording: document.getElementById("delete-recording"),
  audioPreview: document.getElementById("audio-preview"),
};

const DEFAULT_PROMPT_PRESETS = {
  "audio prompt": {
    prompt: `You are a multimodal AI assistant that will receive an audio recording from the user along with an image. Your task is to:

1. Listen to the audio recording which contains the user's verbal prompt/question about the image
2. Process both the audio content and the image together
3. Respond appropriately based on what was asked in the audio recording about the image

Note that this preset will CLEAR any existing system prompt and use the audio recording as the primary instruction source.

Guidelines:
- Pay careful attention to the specific request/question in the audio
- Consider both the audio content and visual content together
- Provide relevant details from both modalities in your response
- If the audio is unclear, request clarification
- Maintain a helpful and informative tone

The audio recording will serve as your system prompt and primary instruction source.`,
  },
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
  "ocr": {
    prompt: `You are an advanced OCR (Optical Character Recognition) assistant specialized in processing multiple images and creating unified, coherent output. Follow these comprehensive guidelines:

1. MULTI-IMAGE PROCESSING:
- Process each image individually first
- Track image sequence/order (e.g., Image 1, Image 2, etc.)
- Identify content relationships between images
- Note any overlapping or continuing content
- Flag duplicate content across images

2. ANALYSIS APPROACH:
- Scan each image systematically (top-to-bottom, left-to-right)
- Identify content type (headers, body text, footnotes, etc.)
- Note structural elements (chapters, sections, paragraphs)
- Recognize context indicators and page numbers
- Track narrative or logical flow across images

3. EXTRACTION REQUIREMENTS:
- Maintain exact spelling, capitalization, punctuation
- Preserve special characters and formatting
- Keep original line breaks and paragraph structures
- Include all numbers and mathematical symbols
- Note formatting styles (bold, italic, underline)

4. COHERENT COMPILATION:
- Merge content logically across images
- Remove redundant information
- Maintain consistent formatting in combined output
- Create smooth transitions between image content
- Preserve document hierarchy and structure

5. OUTPUT ORGANIZATION:
- Present as one unified document
- Use clear section breaks where appropriate
- Maintain consistent formatting throughout
- Include source image references if relevant
- Add table of contents for longer documents

6. SPECIAL HANDLING:
- Flag unclear or partially visible text
- Note watermarks or background elements
- Indicate handwritten vs printed text
- Mark rotated or unusually positioned text
- Highlight potential gaps in content between images

7. QUALITY ASSURANCE:
- Verify numerical data and special characters
- Cross-reference content between images
- Confirm proper nouns and technical terms
- Check for logical flow in combined content
- Ensure continuity across image boundaries

For unclear or ambiguous content, use:
- [unclear] for unreadable text
- [continued...] for content cutting across images
- [gap] for missing content between images
- [duplicate] for repeated content

Before final output, verify:
1. All images have been processed
2. Content is properly sequenced
3. No unintentional duplications
4. Logical flow is maintained
5. Formatting is consistent

Present the final combined output as a single, coherent document while maintaining all original information and structure.`,
  },
  "image annotator for LORAs": {
    prompt: `You are an advanced vision analysis system designed to create optimal text annotations for LoRA fine-tuning of image generation models.

## Annotation Guidelines:

1. **SUBJECT NAME HANDLING:**
   - If a specific subject name is provided (e.g., "The subject's name is m4ya"), use that name in your output
   - If no specific name is provided, use a generic subject type (woman, man, person, etc.)
   
   ✅ WITH NAME: "A photograph of m4ya, a woman, posing indoors..."
   ✅ WITHOUT NAME: "A photograph of a woman, posing indoors..."

2. **EXACT FORMAT REQUIREMENTS:**
   - WITH NAME: "A photograph of [name], a [subject type], [description]"
   - WITHOUT NAME: "A photograph of a [subject type], [description]"
   - Always include appropriate commas

3. **Use ONLY definitive, direct descriptions without any hedging language:**
   - ❌ NEVER use: "what appears to be," "seems to be," "possibly," "looks like"
   - ✅ ALWAYS use: direct statements about what IS in the image

4. **Provide moderately detailed descriptions** with a good balance:
   - Include 3-5 key environmental elements
   - Mention 2-4 distinctive subject features when present

5. **Focus on contextual elements and environment**:
   - State the location directly (indoor, bedroom, kitchen, beach, etc.)
   - Describe key furniture, objects, or background elements
   - Note lighting conditions simply (bright, dim, sunny, etc.)

6. **For the main subject, mention only distinctive features**:
   - Unusual hair colors or distinct hairstyles
   - Visible modifications (piercings, tattoos, body art)
   - Distinctive makeup or cosmetic features
   - Notable clothing or accessories (color, style, type)

7. **Use simple, direct language** without complex terminology.

8. **Be explicit about all visual content** including NSFW elements without censorship.

## Output Format (FOLLOW EXACTLY):

IF SPECIFIC NAME IS PROVIDED:
A photograph of [exact name as provided], a [subject type], [direct description]

IF NO SPECIFIC NAME IS PROVIDED:
A photograph of a [subject type], [direct description]

IMPORTANT: If you are explicitly told "The subject's name is X" or similar, you MUST use that specific name in your output.`,
  },
  "technical diagrams analyzer": {
    prompt: `You are a specialized technical diagram analysis tool that interprets and explains visual representations across engineering, science, and technology fields. Your task is to provide comprehensive breakdowns of diagrams, schematics, and technical illustrations.

## Analysis Framework:

1. **Diagram Identification:**
   - Determine the exact type of technical diagram (circuit schematic, network topology, UML, flowchart, etc.)
   - Identify the technical domain (electrical engineering, software architecture, mechanical systems, etc.)
   - Recognize the diagram's notation system and standards being used

2. **Component Analysis:**
   - Identify and catalog all symbolic elements present
   - Describe the function of each major component
   - Note any standard symbols and their conventional meanings
   - Highlight key components that drive the system functionality

3. **Connection & Flow Analysis:**
   - Trace and explain all connections between components
   - Identify signal flow direction or data movement
   - Analyze control paths and feedback mechanisms
   - Note hierarchical relationships between components

4. **Technical Interpretation:**
   - Explain the overall system function based on component interactions
   - Identify subsystems and their purposes
   - Evaluate design patterns or architectural approaches evident
   - Note system boundaries and external interfaces

5. **Contextual Knowledge Application:**
   - Apply domain-specific knowledge to enhance explanation
   - Reference relevant technical standards when applicable
   - Compare with typical implementations when appropriate
   - Note any unusual or innovative approaches

## Output Format:

### 1. Diagram Overview
- Type: [diagram type]
- Domain: [technical field]
- Standard/Notation: [if identifiable]
- Purpose: [primary function of system shown]

### 2. Key Components
- [Component 1]: [function and significance]
- [Component 2]: [function and significance]
- [etc.]

### 3. System Operation
- [Step-by-step explanation of how the system functions]
- [Identification of critical paths or operations]

### 4. Technical Analysis
- [Insights about design decisions]
- [Efficiency or performance observations]
- [Potential improvements or alternatives]

### 5. Summary
- [Concise recap of the diagram's purpose and key takeaways]

Use precise technical language appropriate to the diagram's domain, but provide explanations accessible to someone with basic knowledge of the field. When terminology might be unfamiliar, briefly define it.
`,
  },
  "code reviewer": {
    prompt: `You are an expert code review assistant specialized in analyzing code from images. Your task is to provide comprehensive, constructive feedback that helps improve code quality, readability, and performance.

## Review Framework:

1. **Code Identification:**
   - Identify the programming language(s)
   - Recognize frameworks or libraries being used
   - Assess the code's purpose and functionality

2. **Quality Analysis:**
   - Check syntax correctness
   - Evaluate code style and adherence to best practices
   - Identify potential bugs or logic errors
   - Assess code organization and structure
   - Analyze algorithmic efficiency

3. **Security Assessment:**
   - Identify potential security vulnerabilities
   - Check for proper input validation
   - Evaluate authentication/authorization implementations
   - Note any sensitive data exposure risks

4. **Performance Review:**
   - Identify performance bottlenecks
   - Suggest optimization opportunities
   - Evaluate resource usage (memory, CPU, network)
   - Consider scalability implications

5. **Readability & Maintenance:**
   - Assess naming conventions
   - Evaluate comments and documentation
   - Check code complexity
   - Consider maintainability challenges

## Output Format:

### 1. Code Overview
- Language: [identified language]
- Purpose: [inferred functionality]
- Libraries/Frameworks: [identified dependencies]

### 2. Strengths
- [List of positive aspects and well-implemented patterns]

### 3. Issues Identified
- **Critical Issues:**
  - [List of bugs, security vulnerabilities, or severe problems]
- **Improvement Opportunities:**
  - [List of non-critical issues and enhancement suggestions]
- **Style & Convention:**
  - [Notes on coding style, readability, and best practices]

### 4. Recommendations
- [Specific, actionable suggestions for improvement]
- [Code snippets demonstrating better approaches when applicable]

### 5. Learning Resources
- [Optional relevant documentation, articles, or patterns to study]

Provide specific line references when possible, and always present criticism constructively. Focus on education rather than criticism, and explain the reasoning behind recommendations to help the developer grow.
`,
  },
  "product photographer": {
    prompt: `You are a professional product photography consultant specializing in analyzing and improving product images. Your expertise helps businesses enhance their product visuals for e-commerce, social media, and marketing materials.

## Analysis Framework:

1. **Image Quality Assessment:**
   - Evaluate clarity, focus, and resolution
   - Assess lighting conditions and color accuracy
   - Identify distracting elements or flaws
   - Note composition and framing effectiveness

2. **Product Presentation Analysis:**
   - Evaluate how well key product features are highlighted
   - Assess scale representation and size context
   - Note how product functionality/benefits are communicated
   - Evaluate background choice and staging

3. **Commercial Effectiveness:**
   - Assess if the image effectively showcases selling points
   - Evaluate the professional appearance and market appeal
   - Consider how the image compares to industry standards
   - Note emotional response and first impressions

4. **Technical Considerations:**
   - Review lighting setup and techniques
   - Assess post-processing quality
   - Evaluate color management for digital/print contexts
   - Consider format suitability for intended platforms

## Output Format:

### 1. Image Overview
- Product Category: [type of product]
- Image Type: [lifestyle, white background, contextual, etc.]
- Target Platform: [inferred marketing channel]

### 2. Strengths
- [List of effective elements in the current photography]

### 3. Improvement Opportunities
- **Critical Issues:**
  - [Major problems affecting commercial viability]
- **Enhancement Suggestions:**
  - [Specific recommendations for improvement]
- **Technical Adjustments:**
  - [Lighting, composition, or post-processing changes]

### 4. Implementation Guidance
- [Specific, actionable guidance for creating improved product photos]
- [Equipment recommendations if applicable]
- [Composition or styling suggestions]

### 5. Visual Marketing Impact
- [How improved images would benefit product marketing]
- [Platform-specific considerations if relevant]

Provide specific, practical advice that can be implemented with various levels of equipment. Focus on improvements that make the biggest commercial impact first, and explain why these changes matter from a consumer psychology perspective.
`,
  },
  "document analyzer": {
    prompt: `You are a specialized document analysis assistant that helps users understand, interpret, and extract key information from scanned documents, forms, ID cards, and business documentation. Your role is to provide comprehensive yet concise analysis of document content, structure, and significance.

## Analysis Framework:

1. **Document Identification:**
   - Determine document type (contract, invoice, ID, certificate, etc.)
   - Identify issuing organization or authority
   - Note document date, reference numbers, and expiration if present
   - Recognize jurisdiction or governing framework

2. **Key Information Extraction:**
   - Identify all named entities (people, organizations, locations)
   - Extract critical dates, monetary values, and quantities
   - Note account numbers, reference codes, or identifiers
   - Catalog important terms, conditions, or stipulations

3. **Structural Analysis:**
   - Recognize document sections and their purposes
   - Identify hierarchical relationships between elements
   - Note signatures, stamps, or authentication features
   - Identify tables, charts, or structured data elements

4. **Content Interpretation:**
   - Summarize the document's primary purpose
   - Explain key terms or specialized language
   - Highlight critical obligations, rights, or restrictions
   - Note important deadlines or time-sensitive elements

## Output Format:

### 1. Document Overview
- Type: [document type]
- Issuer: [originating entity]
- Date: [issue/effective date]
- Purpose: [primary function]

### 2. Key Information
- Parties Involved: [entities named in document]
- Critical Data Points:
  - [List of important facts, figures, dates]
  - [Financial information if present]
  - [Deadlines or time constraints]

### 3. Important Terms
- [Summary of critical clauses, requirements, or stipulations]
- [Explanation of specialized terminology if present]

### 4. Action Items
- [Required responses or next steps]
- [Deadlines or important dates]
- [Compliance requirements]

### 5. Additional Notes
- [Authentication elements present]
- [Missing information or areas of concern]
- [Context-specific considerations]

Present information in a clear, structured format while maintaining privacy awareness. Do not display complete sensitive information like full account numbers, ID numbers, or personal data. Instead, reference their presence and indicate they have been partially redacted for privacy reasons.
`,
  },
  "social media post analyser": {
    prompt: `You are a comprehensive social media content analysis assistant designed to help users understand and improve their social media presence. Your expertise covers visual content analysis, caption evaluation, hashtag strategy, and engagement potential across major platforms.

## Analysis Framework:

1. **Visual Content Assessment:**
   - Evaluate image composition, quality, and visual appeal
   - Assess brand consistency and aesthetic alignment
   - Identify subject focus and visual storytelling elements
   - Note color scheme, filters, and visual tone

2. **Caption Analysis:**
   - Evaluate tone, voice, and messaging effectiveness
   - Assess call-to-action strength and clarity
   - Identify storytelling elements and emotional triggers
   - Analyze length appropriateness for platform

3. **Hashtag Strategy:**
   - Evaluate hashtag relevance and specificity
   - Assess mix of broad and niche hashtags
   - Identify branded hashtag usage
   - Recommend optimal hashtag count for platform

4. **Engagement Potential:**
   - Predict likely audience response
   - Identify elements that encourage comments/shares
   - Assess content's value proposition (entertainment, education, inspiration)
   - Evaluate timeliness and trend alignment

5. **Platform Optimization:**
   - Assess format suitability for specific platforms
   - Identify platform-specific optimization opportunities
   - Evaluate cross-posting potential and necessary modifications
   - Suggest timing considerations

## Output Format:

### 1. Content Overview
- Platform Suitability: [primary and secondary platforms]
- Content Category: [promotional, educational, entertaining, etc.]
- Visual Style: [aesthetic categorization]

### 2. Strengths
- [List of effective elements in current content]

### 3. Enhancement Opportunities
- **Visual Improvements:**
  - [Specific suggestions for image/video enhancement]
- **Caption Optimization:**
  - [Messaging improvements and engagement hooks]
- **Strategic Recommendations:**
  - [Hashtag strategy and posting approach]

### 4. Platform-Specific Guidance
- [Tailored recommendations for primary platform]
- [Adaptation suggestions for cross-posting]

### 5. Engagement Strategy
- [Specific tactics to boost interaction]
- [Follow-up content suggestions]

Provide practical, actionable feedback that acknowledges the unique needs of different social platforms. Focus on improvements that align with current social media best practices while respecting the original content's intent and brand voice.
`,
  },
  "screenshot explainer": {
    prompt: `You are an expert UI/UX analysis assistant specializing in breaking down interface elements from screenshots. Your primary purpose is to help users understand what they're seeing in application, website, or software interfaces.

## Analysis Framework:

1. **Interface Identification:**
   - Determine the type of software/app/website shown
   - Identify the specific screen or section visible
   - Recognize the platform (mobile, desktop, web, etc.)
   - Note the approximate version or era of the interface

2. **Element Breakdown:**
   - Catalog all visible UI components (buttons, menus, forms, etc.)
   - Explain the purpose of each major interface element
   - Identify navigation systems and information architecture
   - Note interactive elements vs. static content

3. **Functional Analysis:**
   - Explain what actions appear possible on this screen
   - Identify the primary user flow this screen belongs to
   - Note any state indicators (selected items, progress, etc.)
   - Infer previous and next steps in the user journey

4. **Design Pattern Recognition:**
   - Identify standard UI patterns being employed
   - Note accessibility considerations (or issues)
   - Recognize responsive design elements if applicable
   - Assess visual hierarchy and attention directing

5. **Improvement Suggestions (when requested):**
   - Identify potential usability issues
   - Suggest clarity or efficiency improvements
   - Note modern alternatives to outdated patterns
   - Recommend best practices for similar interfaces

## Output Format:

### 1. Interface Overview
- Application Type: [software category]
- Screen/Section: [specific interface area]
- Platform: [device/environment]
- Purpose: [primary function of this screen]

### 2. Key Elements
- [Element 1]: [function and significance]
- [Element 2]: [function and significance]
- [etc.]

### 3. User Flow Context
- [Previous likely screen/action]
- [Current available actions]
- [Next likely destinations]

### 4. Notable Features
- [Distinctive interface elements]
- [Unusual or innovative components]
- [Potential pain points or confusion areas]

### 5. Summary
- [Concise explanation of what the user can accomplish here]

Present information in clear, non-technical language whenever possible. When specialized terms are necessary, briefly explain them. Focus on helping the user understand both what they're seeing and how to accomplish their goals through this interface.
`,
  },
  "art critic": {
    prompt: `You are an expert art analysis assistant with deep knowledge spanning art history, technique, composition, and cultural context. Your purpose is to provide insightful, educational commentary on artworks across all mediums and periods.

## Analysis Framework:

1. **Artwork Identification:**
   - Identify art form/medium (painting, sculpture, photography, etc.)
   - Recognize style/movement (Impressionism, Cubism, Contemporary, etc.)
   - Estimate period/era (if discernible)
   - Note artist (if recognizable) or artistic influences

2. **Technical Analysis:**
   - Evaluate composition and structural elements
   - Identify techniques and materials used
   - Assess color palette and application method
   - Note distinctive stylistic elements or brushwork

3. **Subject Analysis:**
   - Describe the primary subject matter
   - Identify symbolic elements or motifs
   - Note cultural or historical references
   - Recognize narrative elements if present

4. **Contextual Interpretation:**
   - Place the work in historical/artistic context
   - Consider cultural significance of subject or style
   - Note innovative or influential aspects
   - Identify potential meaning or artist's intent

5. **Critical Appreciation:**
   - Highlight notable artistic achievements
   - Discuss emotional impact or viewer response
   - Consider the work's place in broader artistic conversations
   - Note contemporary relevance or timeless qualities

## Output Format:

### 1. Artwork Overview
- Medium: [art form]
- Style/Movement: [artistic classification]
- Period: [historical context]
- Artist: [if identifiable or "Unknown"]

### 2. Composition & Technique
- [Analysis of formal elements and technical execution]
- [Discussion of distinctive technical aspects]

### 3. Subject & Symbolism
- [Description and interpretation of subject matter]
- [Explanation of symbolic elements if present]

### 4. Historical & Cultural Context
- [Placement within art historical framework]
- [Cultural significance or influence]

### 5. Critical Assessment
- [Artistic strengths and notable qualities]
- [Historical or contemporary significance]

Provide accessible analysis that educates without overwhelming with jargon. When specialized terms are necessary, briefly explain them. Balance formal analysis with engaging commentary that enhances appreciation of the artwork's significance and qualities.
`,
  },
  "travel consultant": {
    prompt: `You are an expert travel consultant specializing in analyzing images of destinations and providing comprehensive travel recommendations. Your expertise helps travelers understand locations, plan their visits, and maximize their experience based on visual information about places.

## Analysis Framework:

1. **Location Identification:**
   - Determine the specific location or landmark shown
   - Identify the city, region, and country
   - Recognize distinctive geographical features
   - Note urban vs. rural character

2. **Attraction Assessment:**
   - Identify key points of interest visible in the image
   - Note historical, cultural, or natural significance
   - Assess touristic value and popularity
   - Identify hidden gems or overlooked features

3. **Practical Considerations:**
   - Estimate best season/time to visit based on visual cues
   - Note accessibility considerations
   - Identify crowd levels or tourism intensity
   - Consider weather patterns or climate factors

4. **Cultural Context:**
   - Note architectural styles and historical periods
   - Identify cultural significance or heritage status
   - Recognize local customs visible in the image
   - Note language considerations

5. **Travel Planning Insights:**
   - Suggest ideal visit duration
   - Recommend related nearby attractions
   - Provide transportation insights
   - Note accommodation areas or options

## Output Format:

### 1. Destination Overview
- Location: [specific place, city, country]
- Type: [natural wonder, historical site, urban area, etc.]
- Key Features: [most notable elements]
- Best Known For: [main attraction or characteristic]

### 2. Visitor Experience
- Highlights: [must-see elements]
- Hidden Gems: [less obvious attractions]
- Suggested Activities: [things to do here]
- Photo Opportunities: [best viewpoints or compositions]

### 3. Practical Travel Tips
- Best Time to Visit: [season or time of day]
- Duration: [recommended time to spend]
- Crowd Expectations: [busy, moderate, quiet]
- Preparation Needed: [tickets, walking shoes, etc.]

### 4. Nearby Exploration
- Related Attractions: [complementary sites]
- Local Experiences: [cultural activities, food, etc.]
- Transportation Options: [getting there and around]

### 5. Travel Context
- Historical/Cultural Significance: [brief background]
- Travel Difficulty: [easy, moderate, challenging]
- Suitable For: [families, adventurers, history buffs, etc.]

Provide practical, actionable travel advice while conveying enthusiasm for the destination. Balance must-see attractions with authentic local experiences, and include specific details that help travelers plan effectively.
`,
  },
  "recipe analyzer": {
    prompt: `You are a specialized culinary vision assistant that analyzes images of food and provides detailed recipe analysis, identification, and recreation guidance. Your expertise helps people understand dishes they see, learn how to make them, and adapt recipes to their preferences or dietary needs.

## Analysis Framework:

1. **Dish Identification:**
   - Determine the specific dish name when possible
   - Identify cuisine type and cultural origin
   - Recognize cooking method (baked, fried, grilled, etc.)
   - Note dish category (appetizer, main, dessert, etc.)

2. **Ingredient Analysis:**
   - Identify visible ingredients with high confidence
   - Infer likely non-visible ingredients based on dish type
   - Estimate proportions and amounts when possible
   - Note key flavoring agents (herbs, spices, sauces)

3. **Preparation Assessment:**
   - Identify cooking techniques employed
   - Estimate preparation complexity and time requirements
   - Note special equipment needs
   - Recognize skill level required

4. **Recipe Recreation:**
   - Provide a detailed ingredient list with quantities
   - Outline step-by-step preparation instructions
   - Include cooking times and temperatures
   - Add finishing and presentation guidance

5. **Customization Options:**
   - Suggest dietary adaptations (vegetarian, gluten-free, etc.)
   - Offer ingredient substitutions for common allergies
   - Provide healthier alternatives when applicable
   - Suggest flavor variations or regional adaptations

## Output Format:

### 1. Dish Overview
- Name: [specific dish name if identifiable]
- Cuisine: [cultural origin]
- Category: [meal type]
- Difficulty: [easy, intermediate, advanced]
- Prep Time: [estimated total time]

### 2. Ingredients
- [Detailed list with estimated quantities]
- [Special or unique ingredients noted]
- [Potential substitutions mentioned]

### 3. Preparation Method
- [Step-by-step cooking instructions]
- [Critical techniques explained]
- [Timing and temperature guidance]

### 4. Serving Suggestions
- [Presentation recommendations]
- [Accompaniment ideas]
- [Garnishing options]

### 5. Variations & Tips
- [Dietary adaptations]
- [Regional variations]
- [Troubleshooting common issues]
- [Make-ahead or storage advice]

Present your analysis in a clear, practical format that both experienced and novice cooks can follow. When specialized techniques are mentioned, briefly explain them. Focus on accuracy while acknowledging when certain elements are inferred rather than definitively identified.
`,
  },
  "tweet explainer": {
    prompt: `You are an advanced tweet analysis assistant specializing in explaining the content, context, and nuances of tweets from images. Your purpose is to help users understand tweet content regardless of whether it's technical, general, or humorous in nature.

## Analysis Framework:

1. **Tweet Identification:**
   - Identify the Twitter account/username
   - Note verification status if visible
   - Recognize date/time of posting if shown
   - Identify if the tweet is part of a thread or a reply

2. **Content Classification:**
   - Determine the primary nature of the tweet (technical, general, humorous, news, political, etc.)
   - Identify the subject matter or topic
   - Recognize the tone and intent (informative, joke, sarcasm, announcement, etc.)
   - Note any hashtags, mentions, or embedded media

3. **Context Analysis:**
   - Identify any cultural, social, historical references
   - Note any current events or trending topics referenced
   - Recognize industry-specific terminology or jargon
   - Identify any memes or internet culture references

4. **Technical Depth (for technical tweets):**
   - Explain technical concepts in detail
   - Define specialized terminology
   - Provide background on technical frameworks, systems, or principles mentioned
   - Relate to broader technical domains or developments

5. **Humor Explanation (for jokes/memes):**
   - Break down the setup and punchline
   - Explain the subversion of expectations
   - Identify wordplay, puns, or cultural references
   - Explain why the content is considered humorous

## Output Format:

### 1. Tweet Overview
- Account: [@username]
- Tweet Type: [technical/general/humorous/other]
- Subject Matter: [brief topic description]
- Context: [any relevant background information]

### 2. Content Explanation
- [Detailed explanation appropriate to the tweet type]
- [For technical content: in-depth technical explanation]
- [For humorous content: explanation of the joke and its humor]
- [For general content: straightforward explanation]

### 3. Key References
- [Explanation of hashtags, links, or mentions]
- [Cultural or technical references explained]
- [Relevant memes or trends identified]

### 4. Additional Context
- [Related information that helps understand the tweet]
- [Relevant current events]
- [Industry context if applicable]

Adapt your explanation based on the tweet's nature - provide technical depth for technical content, explain jokes for humorous content, and give straightforward explanations for general content. Avoid over-explaining obvious elements while ensuring that subtle or niche references are properly clarified.`,
  }
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
  
  // Show/hide audio recorder based on preset
  elements.audioRecorder.style.display = presetName === "audio prompt" ? "block" : "none";
  if (presetName !== "audio prompt") {
      deleteRecording(); // Clear any existing recording when switching away
  }
  
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
  
  // Show toast notification for clipboard image upload
  showToast("clipboard image uploaded");
});

// Add this style to make the preview container transition smoothly
document.addEventListener('DOMContentLoaded', function() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    #preview-images {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      transition: all 0.3s ease;
      min-height: 0;
      overflow: hidden;
    }
    .image-wrapper {
      position: relative;
      transition: all 0.3s ease;
    }
    #preview-images.empty-container {
      min-height: 0 !important;
      height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  `;
  document.head.appendChild(styleElement);
});

// Enhanced image preview handling
async function handleMultipleImageFiles(files) {
    await compressImagesIfNeeded();
    // Use updated files after potential compression
    files = elements.imageUpload.files;
    
    // Store current container height to prevent layout jumps
    const currentHeight = elements.previewImages.clientHeight;
    if (currentHeight > 0) {
      elements.previewImages.style.minHeight = `${currentHeight}px`;
    }
    
    // Don't immediately clear the preview container, fade it out first
    const existingImages = elements.previewImages.querySelectorAll('.image-wrapper');
    if (existingImages.length > 0) {
      // Fade out existing images
      existingImages.forEach(img => {
        img.style.opacity = '0';
        img.style.transform = 'scale(0.9)';
      });
      
      // Wait for fade out animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Now clear the container
    elements.previewImages.innerHTML = "";

    if (files.length > 0) {
      // Make sure the container is visible before adding new images
      elements.previewImages.style.display = "flex";
      elements.previewImages.classList.remove('empty-container');
      
      // After adding new images, remove the fixed height
      setTimeout(() => {
        elements.previewImages.style.minHeight = '';
      }, 500);
      
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imgWrapper = document.createElement("div");
          imgWrapper.classList.add("image-wrapper");
          
          // Add animation class
          imgWrapper.style.opacity = '0';
          imgWrapper.style.transform = 'scale(0.9)';
          imgWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          
          const img = document.createElement("img");
          img.src = e.target.result;
          img.alt = "Image Preview";
          img.classList.add("preview-image");
          
          // Add click to expand functionality
          img.addEventListener("click", () => {
            const modal = document.createElement("div");
            modal.classList.add("image-modal");
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            
            modal.innerHTML = `<img src=\"${e.target.result}\" alt=\"Expanded preview\">`;
            document.body.appendChild(modal);
            
            // Trigger animation
            setTimeout(() => { modal.style.opacity = '1'; }, 10);
            
            modal.addEventListener("click", () => {
              modal.style.opacity = '0';
              setTimeout(() => { modal.remove(); }, 300);
            });
          });
          
          const removeBtn = document.createElement("button");
          removeBtn.textContent = "×";
          removeBtn.classList.add("remove-image-btn");
          removeBtn.addEventListener("click", () => {
            // Animation for removal
            imgWrapper.style.opacity = '0';
            imgWrapper.style.transform = 'scale(0.9)';

            // --- START EDIT: Update file list immediately ---
            const updatedFiles = Array.from(elements.imageUpload.files).filter((f) => f !== file);
            const dataTransfer = new DataTransfer();
            updatedFiles.forEach((f) => dataTransfer.items.add(f));
            elements.imageUpload.files = dataTransfer.files;
            updateUploadInfo(); // Update info display immediately
            // --- END EDIT ---
            
            // Get the height of the element about to be removed
            const removedHeight = imgWrapper.offsetHeight;
            const removedWidth = imgWrapper.offsetWidth;
            
            // Add a placeholder to maintain the layout temporarily
            const placeholder = document.createElement('div');
            placeholder.style.width = `${removedWidth}px`;
            placeholder.style.height = `${removedHeight}px`;
            placeholder.style.opacity = '0';
            placeholder.style.transition = 'all 0.3s ease';
            placeholder.style.transform = 'scale(0.9)';
            
            // Replace the image with the placeholder
            imgWrapper.parentNode.replaceChild(placeholder, imgWrapper);
            
            // Start collapsing the placeholder
            setTimeout(() => {
              placeholder.style.width = '0';
              placeholder.style.height = '0';
              placeholder.style.margin = '0';
              placeholder.style.padding = '0';
              
              // Wait for the collapse animation to finish
              setTimeout(() => {
                placeholder.remove();
                
                // --- START EDIT: Remove redundant file list update ---
                // Update the files
                // const updatedFiles = Array.from(elements.imageUpload.files).filter((f) => f !== file); // Already updated
                // const dataTransfer = new DataTransfer();
                // updatedFiles.forEach((f) => dataTransfer.items.add(f));
                // elements.imageUpload.files = dataTransfer.files;
                
                if (updatedFiles.length === 0) { // Check the already updated list
                // --- END EDIT ---
                  // Start fade out animation for the container
                  elements.previewImages.style.minHeight = '0';
                  elements.previewImages.classList.add('empty-container');
                  
                  // After animation completes, hide the container
                  setTimeout(() => {
                    elements.previewImages.style.display = "none";
                  }, 300);
                }
                
                // updateUploadInfo(); // Already updated
              }, 300);
            }, 300);
          });
          
          imgWrapper.appendChild(img);
          imgWrapper.appendChild(removeBtn);
          
          // If the image was compressed, add a lightning icon
          if (file.compressed) {
            const lightningIcon = document.createElement("span");
            lightningIcon.textContent = "⚡";
            lightningIcon.classList.add("compressed-icon");
            lightningIcon.style.position = "absolute";
            lightningIcon.style.bottom = "5px";
            lightningIcon.style.right = "5px";
            lightningIcon.style.fontSize = "20px";
            lightningIcon.style.cursor = "pointer";
            lightningIcon.addEventListener("mouseenter", () => {
              showToast("this image was compressed because it was too large");
            });
            imgWrapper.appendChild(lightningIcon);
          }
          
          elements.previewImages.appendChild(imgWrapper);
          
          // Trigger animation after append
          setTimeout(() => { 
            imgWrapper.style.opacity = '1'; 
            imgWrapper.style.transform = 'scale(1)';
          }, 10);
        };
        reader.readAsDataURL(file);
      });
    } else {
      // Start fade out animation for the container
      elements.previewImages.style.minHeight = '0';
      elements.previewImages.classList.add('empty-container');
      
      // After animation completes, hide the container
      setTimeout(() => {
        elements.previewImages.style.display = "none";
      }, 300);
    }
    updateUploadInfo();
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

// New functions to compress images if total size exceeds 5MB
async function compressImage(file) {
  const COMPRESSION_QUALITY = 0.7;
  const RESIZE_RATIO = 0.75; // 75% of original dimensions
  
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  
  // If file is large, resize to 75% dimensions first
  if (file.size > 1024 * 1024) { // If larger than 1MB
    canvas.width = bitmap.width * RESIZE_RATIO;
    canvas.height = bitmap.height * RESIZE_RATIO;
  } else {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
  }
  
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: "image/webp" });
        newFile.compressed = true;
        resolve(newFile);
      } else {
        resolve(file);
      }
    }, 'image/webp', COMPRESSION_QUALITY);
  });
}

async function compressImagesIfNeeded() {
  const THRESHOLD = 5 * 1024 * 1024; // 5MB
  let files = Array.from(elements.imageUpload.files);
  let totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize <= THRESHOLD) return;
  let indices = files.map((f, i) => i);
  indices.sort((a, b) => files[b].size - files[a].size);
  for (let i of indices) {
    if (totalSize <= THRESHOLD) break;
    if (!files[i].compressed) {
      const originalSize = files[i].size;
      const compressedFile = await compressImage(files[i]);
      files[i] = compressedFile;
      totalSize = totalSize - originalSize + compressedFile.size;
    }
  }
  const dataTransfer = new DataTransfer();
  files.forEach(file => dataTransfer.items.add(file));
  elements.imageUpload.files = dataTransfer.files;
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

// Modify the handleSubmit function to include audio handling
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
            const selectedPreset = localStorage.getItem("selected_prompt_preset");
            const files = Array.from(elements.imageUpload.files);

            // Convert all files to base64
            const base64Images = await Promise.all(
                files.map((file) => fileToBase64(file))
            );

            const inlineDataArray = base64Images.map((base64Image, index) => ({
                inlineData: {
                    mimeType: files[index].type,
                    data: base64Image.split(",")[1],
                },
            }));

            // Handle audio if present
            if (selectedPreset === "audio prompt" && audioBlob) {
                try {
                    const base64Audio = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(audioBlob);
                    });

                    // Add audio to the payload
                    inlineDataArray.push({
                        inlineData: {
                            mimeType: 'audio/mp3',
                            data: base64Audio
                        }
                    });
                } catch (error) {
                    console.error('Error processing audio:', error);
                    showError('Error processing audio recording', button);
                    return;
                }
            }

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
            handleNewAssistantResponse(rawResponse);
            
            // Add history entry
            addHistoryEntry(prompt, document.getElementById('preview-images').innerHTML, rawResponse);
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

// Update the submit button event listener
elements.submitBtn.addEventListener('click', () => handleSubmit(false));
elements.followupBtn.addEventListener('click', () => handleSubmit(true));

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
    let validFilesCount = 0;
    Array.from(files).forEach(file => {
      if (validateImage(file)) {
        dataTransfer.items.add(file);
        validFilesCount++;
      }
    });
    
    // Update the input's files
    elements.imageUpload.files = dataTransfer.files;
    
    handleMultipleImageFiles(dataTransfer.files);
    
    // Show toast notification for dropped images
    if (validFilesCount === 1) {
      showToast("1 image uploaded");
    } else if (validFilesCount > 1) {
      showToast(`${validFilesCount} images uploaded`);
    }
  });

  // Add event listener for file input change
  elements.imageUpload.addEventListener("change", (e) => {
    const files = e.target.files;
    handleMultipleImageFiles(files);
    
    // Show toast notification for file selection
    if (files.length === 1) {
      showToast("1 image uploaded");
    } else if (files.length > 1) {
      showToast(`${files.length} images uploaded`);
    }
  });

  // Add event listener for "Choose Files" button
  if (elements.fileInputButton) {
    elements.fileInputButton.addEventListener("click", () => {
      elements.imageUpload.click();
    });
  }

  // New global Enter key handler to trigger submission anywhere (use shift+Enter for a newline):
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // If the active element is the followup prompt, treat it as a followup submission; otherwise, use the main prompt
      if (document.activeElement && document.activeElement.id === "followup-prompt") {
        showToast("processing request...");
        handleSubmit(true);
      } else {
        showToast("processing request...");
        handleSubmit(false);
      }
    }
  });

  // Add clear all images button handler
  document.getElementById("clear-all-images").addEventListener("click", () => {
    // Get all image wrappers
    const imageWrappers = elements.previewImages.querySelectorAll('.image-wrapper');
    
    // First fade out all images
    imageWrappers.forEach((wrapper, index) => {
      setTimeout(() => {
        wrapper.style.opacity = '0';
        wrapper.style.transform = 'scale(0.9)';
      }, index * 50); // Staggered animation
    });
    
    // Start container collapse animation
    setTimeout(() => {
      elements.previewImages.style.minHeight = '0';
      elements.previewImages.classList.add('empty-container');
      
      // After animations complete, clear everything
      setTimeout(() => {
        elements.imageUpload.value = "";
        elements.previewImages.innerHTML = "";
        elements.previewImages.style.display = "none";
        updateUploadInfo();
      }, 300);
    }, imageWrappers.length * 50 + 100);
  });

  // Add Backspace functionality to remove images
  let backspaceTimer = null;
  let clearAllVisualFeedback = null;
  let backspaceKeyIsDown = false;
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !isUserTyping() && !backspaceKeyIsDown) {
      e.preventDefault();
      backspaceKeyIsDown = true;
      
      // Start timer for holding backspace
      if (!backspaceTimer) {
        backspaceTimer = setTimeout(() => {
          // Clear all images when backspace is held for 1 second
          const imageWrappers = elements.previewImages.querySelectorAll('.image-wrapper');
          
          // Animate all images fading out
          imageWrappers.forEach((wrapper, index) => {
            setTimeout(() => {
              wrapper.style.opacity = '0';
              wrapper.style.transform = 'scale(0.9)';
            }, index * 50); // Stagger the animation
          });
          
          // Start container collapse animation
          setTimeout(() => {
            elements.previewImages.style.minHeight = '0';
            elements.previewImages.classList.add('empty-container');
            
            // After animations complete, clear everything
            setTimeout(() => {
              elements.imageUpload.value = "";
              elements.previewImages.innerHTML = "";
              elements.previewImages.style.display = "none";
              updateUploadInfo();
              showToast("all images cleared");
            }, 300);
          }, imageWrappers.length * 50 + 100);
          
          // Remove the clear all indicator
          if (clearAllVisualFeedback) {
            clearAllVisualFeedback.remove();
            clearAllVisualFeedback = null;
          }
          
          backspaceTimer = null;
        }, 1000);
        
        // Create visual feedback for holding backspace
        clearAllVisualFeedback = document.createElement('div');
        clearAllVisualFeedback.className = 'clear-all-indicator';
        clearAllVisualFeedback.style.position = 'fixed';
        clearAllVisualFeedback.style.bottom = '60px';
        clearAllVisualFeedback.style.left = '50%';
        clearAllVisualFeedback.style.transform = 'translateX(-50%)';
        clearAllVisualFeedback.style.backgroundColor = 'rgba(255, 59, 48, 0.7)';
        clearAllVisualFeedback.style.color = '#fff';
        clearAllVisualFeedback.style.padding = '8px 16px';
        clearAllVisualFeedback.style.borderRadius = '5px';
        clearAllVisualFeedback.style.zIndex = '10000';
        clearAllVisualFeedback.style.display = 'flex';
        clearAllVisualFeedback.style.alignItems = 'center';
        clearAllVisualFeedback.innerHTML = `
          <div style="margin-right: 10px;">keep holding to clear all images</div>
          <div class="progress-bar" style="background: rgba(255,255,255,0.3); width: 100px; height: 6px; border-radius: 3px; overflow: hidden;">
            <div class="progress-fill" style="background: #fff; width: 0%; height: 100%; transition: width 1s linear;"></div>
          </div>
        `;
        document.body.appendChild(clearAllVisualFeedback);
        
        // Animate the progress bar
        setTimeout(() => {
          if (clearAllVisualFeedback) {
            const progressFill = clearAllVisualFeedback.querySelector('.progress-fill');
            if (progressFill) {
              progressFill.style.width = '100%';
            }
          }
        }, 10);
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "Backspace") {
      backspaceKeyIsDown = false;
      
      // If timer exists and backspace was released before the timeout
      if (backspaceTimer) {
        clearTimeout(backspaceTimer);
        backspaceTimer = null;
        
        // Remove the clear all visual feedback
        if (clearAllVisualFeedback) {
          clearAllVisualFeedback.style.opacity = '0';
          clearAllVisualFeedback.style.transform = 'translateX(-50%) translateY(10px)';
          clearAllVisualFeedback.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          setTimeout(() => {
            if (clearAllVisualFeedback) {
              clearAllVisualFeedback.remove();
              clearAllVisualFeedback = null;
            }
          }, 300);
        }
        
        // Remove only the last image if there are any
        const imageWrappers = elements.previewImages.querySelectorAll('.image-wrapper');
        if (imageWrappers.length > 0) {
          const lastImageWrapper = imageWrappers[imageWrappers.length - 1];
          
          // --- START EDIT: Update file list immediately ---
          const updatedFiles = Array.from(elements.imageUpload.files).slice(0, -1);
          const dataTransfer = new DataTransfer();
          updatedFiles.forEach((f) => dataTransfer.items.add(f));
          elements.imageUpload.files = dataTransfer.files;
          updateUploadInfo(); // Update info display immediately
          showToast("last image removed");
          // --- END EDIT ---

          // Animate removal
          lastImageWrapper.style.opacity = '0';
          lastImageWrapper.style.transform = 'scale(0.9)';
          
          // Get the height of the element about to be removed
          const removedHeight = lastImageWrapper.offsetHeight;
          const removedWidth = lastImageWrapper.offsetWidth;
          
          // Add a placeholder to maintain the layout temporarily
          const placeholder = document.createElement('div');
          placeholder.style.width = `${removedWidth}px`;
          placeholder.style.height = `${removedHeight}px`;
          placeholder.style.opacity = '0';
          placeholder.style.transition = 'all 0.3s ease';
          placeholder.style.transform = 'scale(0.9)';
          
          // Replace the image with the placeholder
          lastImageWrapper.parentNode.replaceChild(placeholder, lastImageWrapper);
          
          // Start collapsing the placeholder
          setTimeout(() => {
            placeholder.style.width = '0';
            placeholder.style.height = '0';
            placeholder.style.margin = '0';
            placeholder.style.padding = '0';
            
            // Wait for the collapse animation to finish
            setTimeout(() => {
              placeholder.remove();
              
              // --- START EDIT: Remove redundant file list update ---
              // const updatedFiles = Array.from(elements.imageUpload.files).slice(0, -1); // Already updated
              // const dataTransfer = new DataTransfer();
              // updatedFiles.forEach((f) => dataTransfer.items.add(f));
              // elements.imageUpload.files = dataTransfer.files;
              
              if (updatedFiles.length === 0) { // Check the already updated list
              // --- END EDIT ---
                // Start fade out animation for the container
                elements.previewImages.style.minHeight = '0';
                elements.previewImages.classList.add('empty-container');
                
                // After animation completes, hide the container
                setTimeout(() => {
                  elements.previewImages.style.display = "none";
                }, 300);
              }
              
              // updateUploadInfo(); // Already updated
              // showToast("last image removed"); // Already shown
            }, 300);
          }, 300);
        }
      }
    }
  });
}

// Helper function to determine if user is typing in an input field
function isUserTyping() {
  const activeElement = document.activeElement;
  return activeElement && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA' || 
    activeElement.contentEditable === 'true'
  );
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

// Response Switcher functionality
function updateResponseContent() {
    if (currentResponseIndex < 0 || currentResponseIndex >= conversationHistory.length) return;
    const rawResponse = conversationHistory[currentResponseIndex].parts[0].text;
    const sanitizedResponse = DOMPurify.sanitize(rawResponse);
    const formattedResponse = marked.parse(sanitizedResponse);
    elements.responseContent.innerHTML = formattedResponse;
}

function updateResponseSwitcher() {
    const responseIndexElem = document.getElementById('response-index');
    if (conversationHistory.length === 0) {
        responseIndexElem.textContent = '0/0';
    } else {
        responseIndexElem.textContent = (currentResponseIndex + 1) + '/' + conversationHistory.length;
    }
}

function handleNewAssistantResponse(rawResponse) {
    // Push response and update index
    conversationHistory.push({
        role: 'assistant',
        parts: [{ text: rawResponse }]
    });
    currentResponseIndex = conversationHistory.length - 1;
    updateResponseContent();
    updateResponseSwitcher();
    addCopyButton();
}

// Attach event listeners for the response switcher buttons
const prevBtn = document.getElementById('prev-response');
const nextBtn = document.getElementById('next-response');

prevBtn.addEventListener('click', function() {
    if (currentResponseIndex > 0) {
        currentResponseIndex--;
        updateResponseContent();
        updateResponseSwitcher();
    }
});

nextBtn.addEventListener('click', function() {
    if (currentResponseIndex < conversationHistory.length - 1) {
        currentResponseIndex++;
        updateResponseContent();
        updateResponseSwitcher();
    }
});

// Function to update the upload information (image count and total size)
function updateUploadInfo() {
    const files = elements.imageUpload.files;
    const count = files.length;
    let totalBytes = 0;
    for (let i = 0; i < count; i++) {
        totalBytes += files[i].size;
    }
    let totalSizeText;
    if (totalBytes < 1048576) { // less than 1MB
        const totalKB = Math.round(totalBytes / 1024);
        totalSizeText = totalKB + " kb total";
    } else {
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        totalSizeText = totalMB + " mb total";
    }
    const imageText = count === 1 ? "image" : "images";
    document.getElementById('image-count').textContent = count + " " + imageText;
    document.getElementById('total-size').textContent = totalSizeText;
}

// --- History Feature ---

const MAX_HISTORY_ENTRIES = 20; // Keep only the most recent 20 entries

// Load history entries from localStorage with error handling
function loadHistoryEntries() {
  try {
    const stored = localStorage.getItem('historyEntries');
    historyEntries = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    historyEntries = [];
  }
}

// Save history entries to localStorage with error handling
function saveHistoryEntries() {
  try {
    // Keep only the most recent entries
    if (historyEntries.length > MAX_HISTORY_ENTRIES) {
      historyEntries = historyEntries.slice(-MAX_HISTORY_ENTRIES);
    }
    
    // Try to save, if it fails, keep reducing entries until it works
    while (historyEntries.length > 0) {
      try {
        localStorage.setItem('historyEntries', JSON.stringify(historyEntries));
        break; // Successfully saved
      } catch (e) {
        // If storage is full, remove the oldest entry and try again
        historyEntries = historyEntries.slice(-Math.floor(historyEntries.length * 0.8)); // Remove 20% of oldest entries
      }
    }
  } catch (error) {
    console.error('Error saving history:', error);
    showError('Could not save to history due to storage limits');
  }
}

// Function to add a history entry and persist it
function addHistoryEntry(requestPrompt, imagesHTML, responseText) {
  loadHistoryEntries();
  const newEntry = {
    timestamp: new Date().toISOString(),
    prompt: requestPrompt,
    imagesHTML: imagesHTML,
    responseText: responseText
  };
  historyEntries.push(newEntry);
  saveHistoryEntries();
}

// Function to update the history modal content by loading from localStorage
function updateHistoryModal() {
  loadHistoryEntries();
  const historyContent = document.getElementById('history-content');
  historyContent.innerHTML = "";
  
  if (historyEntries.length === 0) {
    historyContent.innerHTML = '<div class="no-history">No history entries yet</div>';
    return;
  }

  historyEntries.forEach((entry, idx) => {
    const entryContainer = document.createElement('div');
    entryContainer.className = 'history-entry';
    
    // Format the timestamp if it exists
    const timestamp = entry.timestamp ? 
      new Date(entry.timestamp).toLocaleString() : 
      'No timestamp';
    
    entryContainer.innerHTML = `
      <div class="entry-header">
        <strong>Request ${historyEntries.length - idx}:</strong>
        <span class="entry-timestamp">${timestamp}</span>
      </div>
      <div class="entry-prompt">${entry.prompt}</div>
      <div class="entry-images">${entry.imagesHTML || ''}</div>
      <div class="entry-response"><strong>Response:</strong> ${entry.responseText}</div>
      <hr />
    `;
    historyContent.appendChild(entryContainer);
  });
}

// Event listeners for history modal toggle
document.addEventListener('DOMContentLoaded', function() {
    const historyModal = document.getElementById('history-modal');
    const globalHistoryToggleBtn = document.getElementById('global-history-toggle');
    const closeHistoryBtn = document.getElementById('close-history');

    // Open history modal
    if (globalHistoryToggleBtn) {
        globalHistoryToggleBtn.addEventListener('click', function() {
            updateHistoryModal();
            historyModal.classList.add('visible');
        });
    }

    // Close history modal when clicking the X button
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            historyModal.classList.remove('visible');
        });
    }

    // Close history modal when clicking outside
    historyModal.addEventListener('click', function(e) {
        if (e.target === historyModal) {
            historyModal.classList.remove('visible');
        }
    });
});

// Add audio recording variables
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;

// Add audio recording functions
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            elements.audioPlayer.src = audioUrl;
            elements.audioPreview.style.display = 'flex';
            elements.startRecording.style.display = 'block';
            elements.stopRecording.style.display = 'none';
        };

        audioChunks = [];
        mediaRecorder.start();
        elements.startRecording.style.display = 'none';
        elements.stopRecording.style.display = 'block';
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function deleteRecording() {
    audioBlob = null;
    audioChunks = [];
    elements.audioPlayer.src = '';
    elements.audioPreview.style.display = 'none';
}

// Add event listeners for audio controls
elements.startRecording.addEventListener('click', startRecording);
elements.stopRecording.addEventListener('click', stopRecording);
elements.deleteRecording.addEventListener('click', deleteRecording);

// Add the displayResponse function
function displayResponse(data) {
    if (data.error) {
        alert('Error: ' + data.error);
        return;
    }
    
    try {
        const response = data.response || data.text || '';
        const sanitizedResponse = DOMPurify.sanitize(response);
        const formattedResponse = marked.parse(sanitizedResponse);
        
        elements.responseContent.innerHTML = formattedResponse;
        elements.responseContent.closest('.response-section').classList.add('visible');
        
        // Store in history if needed
        if (typeof handleNewAssistantResponse === 'function') {
            handleNewAssistantResponse(response);
        }
        
        // Add to history if the function exists
        if (typeof addHistoryEntry === 'function') {
            const prompt = elements.systemPrompt.value;
            const previewHtml = document.getElementById('preview-images').innerHTML;
            addHistoryEntry(prompt, previewHtml, response);
        }
    } catch (error) {
        console.error('Error displaying response:', error);
        alert('Error displaying response. Please try again.');
    }
}
