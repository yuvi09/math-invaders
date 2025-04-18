export interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    difficulty: 'easy' | 'medium' | 'hard';
    type: 'addition' | 'subtraction' | 'multiplication' | 'division';
    points: number;
    timeLimit: number;
}

// Remove the duplicate QuestionSet interface since it's already defined in QuestionSet.ts 