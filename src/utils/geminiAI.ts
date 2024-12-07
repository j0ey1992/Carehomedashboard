import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variables
const API_KEY = 'AIzaSyBxko4IMxiiJ13GDtFee1c0ED0uz6V9yew';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export interface AIEnhancementOptions {
  type: 'summarize' | 'improve';
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are an AI assistant for Voyage Care support workers, specializing in:
- UK healthcare laws and regulations
- Headway accreditation standards
- SMART goal setting for brain injury rehabilitation
- Best practices in care delivery

Always provide responses that:
1. Align with UK healthcare laws and regulations
2. Follow Headway accreditation guidelines
3. Use person-centered language (e.g., "people we support")
4. Include practical, actionable advice
5. Reference relevant policies when applicable

Format your responses using markdown:
- Use **bold** for titles and important points
- Use numbered lists for steps or procedures
- Use bullet points for key information
- Use line breaks to separate sections
- Structure complex information in clear sections

If unsure about any specific policy or regulation, acknowledge the limitation and suggest consulting with a supervisor.`;

export const enhanceWithAI = async ({ type, content }: AIEnhancementOptions): Promise<string> => {
  try {
    let prompt = '';
    
    if (type === 'summarize') {
      prompt = `Please provide a clear and concise summary of the following text, maintaining all important details but in a more condensed form:\n\n${content}`;
    } else if (type === 'improve') {
      prompt = `Please improve the following text to be more professional, clear, and well-structured while maintaining its core message:\n\n${content}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error using Gemini AI:', error);
    throw new Error('Failed to enhance content with AI');
  }
};

export const getChatResponse = async (message: string, context: string = ''): Promise<string> => {
  try {
    const prompt = `${SYSTEM_PROMPT}

Context: ${context}

Format the response with clear structure and markdown formatting:
- Use **bold** for titles and important points
- Use numbered lists for steps or procedures
- Use bullet points for key information
- Use line breaks to separate sections

User: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error getting chat response:', error);
    throw new Error('Failed to get AI response');
  }
};

export const generateSMARTGoal = async (context: string): Promise<string> => {
  try {
    const prompt = `Create a SMART goal for the following context in brain injury rehabilitation. Ensure the goal is:
    - Specific: Clear and unambiguous
    - Measurable: Quantifiable progress
    - Achievable: Realistic for the person we support
    - Relevant: Meaningful for their rehabilitation
    - Time-bound: Has a clear timeframe

    Format the response with clear structure and markdown:
    - Use **bold** for titles and key points
    - Use bullet points for details
    - Use line breaks to separate sections

    Context: ${context}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating SMART goal:', error);
    throw new Error('Failed to generate SMART goal');
  }
};
