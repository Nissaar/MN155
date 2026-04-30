export interface CouncilMemberResponse {
  model: string;
  content: string;
  status: 'pending' | 'thinking' | 'done' | 'error';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isCouncil?: boolean;
  councilResponses?: CouncilMemberResponse[];
}

export interface ChatSession {
  id: string;
  title: string;
  model: ModelType;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  is_admin: boolean;
  status: 'pending' | 'approved' | 'denied';
}

export type ModelType = 
  | 'auto'
  | 'claude-3-5-sonnet' 
  | 'claude-3-5-haiku'
  | 'claude-opus-4.7' 
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'gpt-4o' 
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'gemini-1.5-pro' 
  | 'gemini-1.5-flash'
  | 'gemini-pro'
  | 'gemini-flash'
  | 'council';

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  model: ModelType;
}

declare global {
  interface Window {
    puter: any;
  }
}
