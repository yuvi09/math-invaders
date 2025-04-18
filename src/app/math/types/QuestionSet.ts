import { Question } from './Question';

export interface QuestionSet {
    name: string;
    description: string;
    minLevel: number;
    maxLevel: number;
    questions: Question[];
} 