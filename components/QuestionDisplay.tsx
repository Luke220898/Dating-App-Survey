import React, { useState, useEffect, useRef } from 'react';
import { Question, Answer, QuestionType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface QuestionDisplayProps {
  question: Question;
  onAnswer: (answer: Answer) => void;
  currentAnswer: Answer;
}

const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);

const DragHandleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
        <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5.5 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14.5 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5.5 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14.5 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    </svg>
);


const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, onAnswer, currentAnswer }) => {
    const { type, text, intro, options } = question;
    const { t } = useLanguage();
    
    // This state now holds the keys for the ranking question.
    const [ranking, setRanking] = useState<string[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [otherValue, setOtherValue] = useState('');
    const [isOtherRadioSelected, setIsOtherRadioSelected] = useState(false);
    
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setOtherValue('');
        setIsOtherRadioSelected(false);
        
        if (type === QuestionType.Ranking && options && typeof options === 'object' && !Array.isArray(options)) {
            const optionKeys = Object.keys(options);
            const hasExistingAnswer = Array.isArray(currentAnswer) && currentAnswer.length === optionKeys.length && currentAnswer.every(k => typeof k === 'string' && optionKeys.includes(k));
            
            if (hasExistingAnswer) {
                setRanking(currentAnswer as string[]);
            } else {
                const shuffledKeys = [...optionKeys];
                for (let i = shuffledKeys.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
                }
                setRanking(shuffledKeys);
                onAnswer(shuffledKeys);
            }
        }
    }, [question.id]);

    useEffect(() => {
        const optionKeys = options && !Array.isArray(options) ? Object.keys(options) : [];

        if (type === QuestionType.Radio) {
            const isCustom = currentAnswer && typeof currentAnswer === 'string' && !optionKeys.includes(currentAnswer as string);
            setIsOtherRadioSelected(isCustom);
            if (isCustom) {
                setOtherValue((currentAnswer as string).trim());
            }
        } else if (type === QuestionType.Checkbox) {
            const selection = (currentAnswer as string[]) || [];
            const customAnswer = selection.find(ans => !optionKeys.includes(ans));
            if (customAnswer) {
                setOtherValue(customAnswer.trim());
            } else {
                setOtherValue('');
            }
        }
    }, [currentAnswer, type, options, question.id]);

     useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (autocompleteWrapperRef.current && !autocompleteWrapperRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [autocompleteWrapperRef]);


    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString()); 
        setTimeout(() => {
            setDraggedIndex(index);
        }, 0);
    };

    const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetIndex: number) => {
        const sourceIndexStr = e.dataTransfer.getData('text/plain');
        if (!sourceIndexStr) return; // Exit if no data transfer
        const sourceIndex = parseInt(sourceIndexStr, 10);
    
        setDraggedIndex(null); // Reset visual state immediately

        if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
            return;
        }
    
        const newRanking = [...ranking];
        const [draggedItem] = newRanking.splice(sourceIndex, 1);
        newRanking.splice(targetIndex, 0, draggedItem);
    
        setRanking(newRanking);
        onAnswer(newRanking);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };
    
    const renderInput = () => {
        const commonInputClass = "w-full p-3 text-xl bg-secondary text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-gray-400";
        const otherInputClass = "w-full p-3 mt-2 text-lg bg-secondary text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-gray-400";

        switch (type) {
            case QuestionType.Number:
                return <input type="number" value={(currentAnswer as number) || ''} onChange={(e) => onAnswer(e.target.value ? parseInt(e.target.value, 10) : null)} className={commonInputClass} placeholder={t('questionDisplay.agePlaceholder') as string} />;
            case QuestionType.Text:
                return <input type="text" value={(currentAnswer as string) || ''} onChange={(e) => onAnswer(e.target.value)} className={commonInputClass} placeholder={t('questionDisplay.textPlaceholder') as string} />;
             case QuestionType.Autocomplete:
                const handleAutocompleteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    onAnswer(value);
                    if (value && Array.isArray(options)) {
                        setAutocompleteSuggestions(
                            options?.filter(opt =>
                                opt.toLowerCase().includes(value.toLowerCase())
                            ).slice(0, 100) || []
                        );
                        setIsDropdownOpen(true);
                    } else {
                        setAutocompleteSuggestions([]);
                        setIsDropdownOpen(false);
                    }
                    setHighlightedIndex(-1);
                };

                const handleSuggestionClick = (suggestion: string) => {
                    onAnswer(suggestion);
                    setAutocompleteSuggestions([]);
                    setIsDropdownOpen(false);
                    setHighlightedIndex(-1);
                };

                const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (isDropdownOpen && autocompleteSuggestions.length > 0) {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedIndex(prev => (prev + 1) % autocompleteSuggestions.length);
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedIndex(prev => (prev - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length);
                        } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (highlightedIndex >= 0) {
                                handleSuggestionClick(autocompleteSuggestions[highlightedIndex]);
                            }
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setIsDropdownOpen(false);
                        }
                    }
                };

                return (
                    <div className="relative" ref={autocompleteWrapperRef}>
                        <input
                            type="text"
                            value={(currentAnswer as string) || ''}
                            onChange={handleAutocompleteChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsDropdownOpen(true)}
                            className={commonInputClass}
                            placeholder={t('questionDisplay.cityPlaceholder') as string}
                            autoComplete="off"
                        />
                        {isDropdownOpen && autocompleteSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg max-h-60 overflow-y-auto shadow-lg">
                                {autocompleteSuggestions.map((suggestion, index) => (
                                    <li
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        onMouseOver={() => setHighlightedIndex(index)}
                                        className={`p-3 text-lg text-secondary cursor-pointer ${
                                            index === highlightedIndex ? 'bg-lightgray' : 'hover:bg-lightgray'
                                        }`}
                                    >
                                        {suggestion}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
            case QuestionType.Textarea:
                return <textarea value={(currentAnswer as string) || ''} onChange={(e) => onAnswer(e.target.value)} rows={4} className={commonInputClass} placeholder={t('questionDisplay.textareaPlaceholder') as string}></textarea>;
            case QuestionType.Radio:
                if (typeof options !== 'object' || Array.isArray(options)) return null;

                const handleRadioChange = (key: string) => {
                    if (key === 'other') {
                        setIsOtherRadioSelected(true);
                        onAnswer(otherValue || ' '); 
                    } else {
                        setIsOtherRadioSelected(false);
                        onAnswer(key);
                    }
                };
                const handleOtherTextChangeRadio = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setOtherValue(newValue);
                    onAnswer(newValue || ' '); 
                };
                return (
                    <div className="space-y-3">
                        {Object.entries(options).map(([key, value]) => {
                            if (key === 'other') {
                                return (
                                    <div key={key}>
                                        <label className={`flex items-center p-4 bg-white rounded-lg cursor-pointer ${
                                            isOtherRadioSelected
                                            ? 'border-2 border-primary' 
                                            : 'border border-gray-300 hover:border-primary'
                                        }`} onClick={() => handleRadioChange('other')}>
                                            <input type="radio" name={question.id} checked={isOtherRadioSelected} readOnly className="hidden" />
                                            <span className="flex-1 text-lg">{value}</span>
                                            {isOtherRadioSelected && <CheckIcon className="w-6 h-6 text-primary"/>}
                                        </label>
                                        {isOtherRadioSelected && (
                                            <input
                                                type="text"
                                                value={otherValue}
                                                onChange={handleOtherTextChangeRadio}
                                                className={otherInputClass}
                                                placeholder={t('questionDisplay.otherPlaceholder') as string}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                );
                            }
                            const isSelected = currentAnswer === key;
                            return (
                                <label key={key} className={`flex items-center p-4 bg-white rounded-lg cursor-pointer ${
                                    isSelected
                                    ? 'border-2 border-primary' 
                                    : 'border border-gray-300 hover:border-primary'
                                }`} onClick={() => handleRadioChange(key)}>
                                    <input type="radio" name={question.id} checked={isSelected} readOnly className="hidden" />
                                    <span className="flex-1 text-lg">{value}</span>
                                    {isSelected && <CheckIcon className="w-6 h-6 text-primary"/>}
                                </label>
                            );
                        })}
                    </div>
                );
            case QuestionType.Checkbox:
                if (typeof options !== 'object' || Array.isArray(options)) return null;
                const optionKeys = Object.keys(options);
                const currentSelection = (currentAnswer as string[] || []);
                const customAnswer = currentSelection.find(ans => !optionKeys.includes(ans));
                const isOtherSelectedForCheckbox = customAnswer !== undefined;
                
                const handleCheckboxChange = (key: string) => {
                    let newSelection: string[];
                    if (key === 'other') {
                        if (isOtherSelectedForCheckbox) {
                            newSelection = currentSelection.filter(item => item !== customAnswer);
                        } else {
                            newSelection = [...currentSelection, otherValue || ' '];
                        }
                    } else {
                        newSelection = currentSelection.includes(key)
                            ? currentSelection.filter(item => item !== key)
                            : [...currentSelection, key];
                    }
                    onAnswer(newSelection);
                };

                const handleOtherTextChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setOtherValue(newValue);
                    const currentCustomAnswer = currentSelection.find(ans => !optionKeys.includes(ans));
                    if (currentCustomAnswer !== undefined) {
                        const newSelection = currentSelection.map(item => 
                            item === currentCustomAnswer ? (newValue || ' ') : item
                        );
                        onAnswer(newSelection);
                    }
                };

                 return (
                    <div className="space-y-3">
                        {Object.entries(options).map(([key, value]) => {
                             if (key === 'other') {
                                return (
                                    <div key={key}>
                                        <label className={`flex items-center p-4 bg-white rounded-lg cursor-pointer ${
                                            isOtherSelectedForCheckbox
                                            ? 'border-2 border-primary' 
                                            : 'border border-gray-300 hover:border-primary'
                                        }`}>
                                            <input type="checkbox" checked={isOtherSelectedForCheckbox} onChange={() => handleCheckboxChange('other')} className="hidden" />
                                            <span className="flex-1 text-lg">{value}</span>
                                            {isOtherSelectedForCheckbox && <CheckIcon className="w-6 h-6 text-primary"/>}
                                        </label>
                                        {isOtherSelectedForCheckbox && (
                                             <input
                                                type="text"
                                                value={otherValue}
                                                onChange={handleOtherTextChangeCheckbox}
                                                className={otherInputClass}
                                                placeholder={t('questionDisplay.otherPlaceholder') as string}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                );
                            }
                            const isSelected = currentSelection.includes(key);
                            return (
                                 <label key={key} className={`flex items-center p-4 bg-white rounded-lg cursor-pointer ${
                                    isSelected
                                    ? 'border-2 border-primary' 
                                    : 'border border-gray-300 hover:border-primary'
                                }`}>
                                    <input type="checkbox" checked={isSelected} onChange={() => handleCheckboxChange(key)} className="hidden" />
                                    <span className="flex-1 text-lg">{value}</span>
                                    {isSelected && <CheckIcon className="w-6 h-6 text-primary"/>}
                                </label>
                            );
                        })}
                    </div>
                );
            case QuestionType.Ranking:
                if (typeof options !== 'object' || Array.isArray(options)) return null;
                const optionMap = options as Record<string, string>;
                return (
                    <ul className="list-none p-0 space-y-3">
                        {ranking.map((itemKey, index) => {
                            const isBeingDragged = draggedIndex === index;
                            const itemText = optionMap[itemKey];

                            return (
                                <li
                                    key={itemKey}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="flex items-center gap-4"
                                >
                                    <div className="flex-shrink-0 w-8 text-center">
                                        <span className="text-xl font-bold text-gray-400">{index + 1}</span>
                                    </div>
                                    
                                    <div className={`flex-grow border rounded-lg cursor-grab ${
                                        isBeingDragged 
                                        ? 'bg-gray-300 border-2 border-dashed border-gray-400' 
                                        : 'bg-white hover:bg-gray-50 shadow-sm'
                                    }`}>
                                        <div className={`flex items-center justify-between p-4 h-[72px] ${isBeingDragged ? 'invisible' : ''}`}>
                                            <span className="text-lg text-secondary flex-grow">{itemText}</span>
                                            <DragHandleIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                );
            default: return null;
        }
    }

    return (
        <div>
            {intro && <p className="text-lg text-gray-600 mb-4">{intro}</p>}
            <h2 className="text-3xl font-bold mb-8">{text}</h2>
            {renderInput()}
        </div>
    );
};

export default QuestionDisplay;