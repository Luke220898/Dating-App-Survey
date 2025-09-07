import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Question, Answer, QuestionType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface QuestionDisplayProps {
    question: Question;
    onAnswer: (answer: Answer) => void;
    currentAnswer: Answer;
}

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);

const DragHandleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
        <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5.5 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14.5 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM5.5 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14.5 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    </svg>
);

// Removed arrow icons after switching to unified pointer-based drag and drop.


const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, onAnswer, currentAnswer }) => {
    const { type, text, intro, options } = question;
    const { t } = useLanguage();

    // This state now holds the keys for the ranking question.
    const [ranking, setRanking] = useState<string[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null); // active item index
    const draggedIndexRef = useRef<number | null>(null);
    const listContainerRef = useRef<HTMLUListElement | null>(null);
    const pointerIdRef = useRef<number | null>(null);
    const pointerTypeRef = useRef<string | null>(null);
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


    // Pointer-based drag logic (works for mouse + touch)
    const reorder = useCallback((from: number, to: number) => {
        setRanking(prev => {
            if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
            const next = [...prev];
            const [m] = next.splice(from, 1);
            next.splice(to, 0, m);
            // Side-effect fuori dal ciclo di rendering sincrono: differiamo a microtask per evitare warning
            Promise.resolve().then(() => onAnswer(next));
            return next;
        });
    }, [onAnswer]);

    const detectIndexFromPointer = (clientY: number): number => {
        if (!listContainerRef.current) return -1;
        const items = Array.from(listContainerRef.current.querySelectorAll('li[data-idx]')) as HTMLLIElement[];
        for (let i = 0; i < items.length; i++) {
            const r = items[i].getBoundingClientRect();
            if (clientY >= r.top && clientY <= r.bottom) return i;
        }
        return items.length - 1;
    };

    // rAF throttling per evitare layout thrash ad alta frequenza
    const frameRef = useRef<number | null>(null);
    const liveRegionRef = useRef<HTMLDivElement | null>(null);
    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (pointerIdRef.current === null || draggedIndexRef.current === null) return;
        if (pointerTypeRef.current === 'touch') {
            e.preventDefault();
        }
        if (frameRef.current != null) return; // già pianificato
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            const from = draggedIndexRef.current;
            const targetIndex = detectIndexFromPointer(e.clientY);
            if (from !== null && targetIndex !== -1 && targetIndex !== from) {
                reorder(from, targetIndex);
                draggedIndexRef.current = targetIndex;
                setDraggedIndex(targetIndex);
                // Annuncio accessibilità
                if (liveRegionRef.current) {
                    liveRegionRef.current.textContent = `${t('questionDisplay.rankItem') || 'Item'} spostato in posizione ${targetIndex + 1}`;
                }
            }
        });
    }, [reorder, t]);

    const handlePointerUp = useCallback((e: PointerEvent) => {
        if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
        pointerIdRef.current = null;
        pointerTypeRef.current = null;
        draggedIndexRef.current = null;
        setDraggedIndex(null);
        document.body.classList.remove('select-none');
        window.removeEventListener('pointermove', handlePointerMove as any);
        window.removeEventListener('pointerup', handlePointerUp as any);
        if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    }, [handlePointerMove]);

    const startPointerDrag = (e: React.PointerEvent, index: number) => {
        if (e.button !== 0) return; // solo tasto principale / touch
        e.preventDefault();
        pointerIdRef.current = e.pointerId;
        pointerTypeRef.current = e.pointerType;
        draggedIndexRef.current = index;
        setDraggedIndex(index);
        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch { /* noop in alcuni browser */ }
        document.body.classList.add('select-none');
        window.addEventListener('pointermove', handlePointerMove as any, { passive: false });
        window.addEventListener('pointerup', handlePointerUp as any, { passive: true });
    };

    const renderInput = () => {
        const commonInputClass = "w-full p-3 text-xl bg-secondary text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-gray-400";
        const otherInputClass = "w-full p-3 mt-2 text-lg bg-secondary text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-gray-400";

        switch (type) {
            case QuestionType.Number: {
                const numberValue = (typeof currentAnswer === 'number') ? String(currentAnswer) : '';
                return <input
                    type="number"
                    value={numberValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                            onAnswer(''); // keep as empty string (never undefined/null)
                        } else {
                            const n = parseInt(val, 10);
                            onAnswer(isNaN(n) ? '' : n);
                        }
                    }}
                    className={commonInputClass}
                    placeholder={t('questionDisplay.agePlaceholder') as string}
                />;
            }
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
                                        className={`p-3 text-lg text-secondary cursor-pointer ${index === highlightedIndex ? 'bg-lightgray' : 'hover:bg-lightgray'
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
                                        <label
                                            className={`interactive-option ${isOtherRadioSelected ? 'is-active' : ''}`}
                                            onClick={() => handleRadioChange('other')}
                                        >
                                            <input type="radio" name={question.id} checked={!!isOtherRadioSelected} readOnly className="hidden" />
                                            <span className="flex-1 text-lg leading-snug">{value}</span>
                                            {isOtherRadioSelected && <CheckIcon className="w-6 h-6 text-primary" />}
                                        </label>
                                        {isOtherRadioSelected && (
                                            <input
                                                type="text"
                                                value={otherValue}
                                                onChange={handleOtherTextChangeRadio}
                                                className={otherInputClass + ' fade-in'}
                                                placeholder={t('questionDisplay.otherPlaceholder') as string}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                );
                            }
                            const isSelected = currentAnswer === key;
                            return (
                                <label
                                    key={key}
                                    className={`interactive-option ${isSelected ? 'is-active' : ''}`}
                                    onClick={() => handleRadioChange(key)}
                                >
                                    <input type="radio" name={question.id} checked={!!isSelected} readOnly className="hidden" />
                                    <span className="flex-1 text-lg leading-snug">{value}</span>
                                    {isSelected && <CheckIcon className="w-6 h-6 text-primary" />}
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
                                        <label
                                            className={`interactive-option ${isOtherSelectedForCheckbox ? 'is-active' : ''}`}
                                        >
                                            <input type="checkbox" checked={!!isOtherSelectedForCheckbox} onChange={() => handleCheckboxChange('other')} className="hidden" />
                                            <span className="flex-1 text-lg leading-snug">{value}</span>
                                            {isOtherSelectedForCheckbox && <CheckIcon className="w-6 h-6 text-primary" />}
                                        </label>
                                        {isOtherSelectedForCheckbox && (
                                            <input
                                                type="text"
                                                value={otherValue}
                                                onChange={handleOtherTextChangeCheckbox}
                                                className={otherInputClass + ' fade-in'}
                                                placeholder={t('questionDisplay.otherPlaceholder') as string}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                );
                            }
                            const isSelected = currentSelection.includes(key);
                            return (
                                <label
                                    key={key}
                                    className={`interactive-option ${isSelected ? 'is-active' : ''}`}
                                >
                                    <input type="checkbox" checked={!!isSelected} onChange={() => handleCheckboxChange(key)} className="hidden" />
                                    <span className="flex-1 text-lg leading-snug">{value}</span>
                                    {isSelected && <CheckIcon className="w-6 h-6 text-primary" />}
                                </label>
                            );
                        })}
                    </div>
                );
            case QuestionType.Ranking:
                if (typeof options !== 'object' || Array.isArray(options)) return null;
                const optionMap = options as Record<string, string>;
                return (
                    <>
                        <div ref={liveRegionRef} aria-live="polite" className="sr-only" />
                        <ul className="list-none p-0 space-y-3" ref={listContainerRef}>
                            {ranking.map((itemKey, index) => {
                                const itemText = optionMap[itemKey];
                                const isActive = draggedIndex === index;
                                return (
                                    <li
                                        key={itemKey}
                                        data-idx={index}
                                        className="flex items-center gap-4 select-none"
                                        role="listitem"
                                    >
                                        <div className="flex-shrink-0 w-8 text-center">
                                            <span className="text-xl font-bold text-gray-400">{index + 1}</span>
                                        </div>
                                        <div
                                            className={`ranking-item ${isActive ? 'drag-active' : ''}`}
                                            role="group"
                                            aria-roledescription="draggable"
                                            aria-grabbed={isActive}
                                            aria-label={`${t('questionDisplay.rankItem') || 'Item'} ${index + 1}: ${itemText}`}
                                            tabIndex={0}
                                            onPointerDown={(e) => startPointerDrag(e, index)}
                                            onKeyDown={(e) => {
                                                if (e.key === ' ' || e.key === 'Enter') {
                                                    if (draggedIndexRef.current === null) {
                                                        draggedIndexRef.current = index;
                                                        setDraggedIndex(index);
                                                    } else {
                                                        draggedIndexRef.current = null;
                                                        setDraggedIndex(null);
                                                    }
                                                    e.preventDefault();
                                                } else if (draggedIndexRef.current !== null) {
                                                    if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        const from = draggedIndexRef.current;
                                                        const to = Math.max(0, from - 1);
                                                        if (to !== from) {
                                                            reorder(from, to);
                                                            draggedIndexRef.current = to;
                                                            setDraggedIndex(to);
                                                        }
                                                    } else if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        const from = draggedIndexRef.current;
                                                        const to = Math.min(ranking.length - 1, from + 1);
                                                        if (to !== from) {
                                                            reorder(from, to);
                                                            draggedIndexRef.current = to;
                                                            setDraggedIndex(to);
                                                        }
                                                    } else if (e.key === 'Escape') {
                                                        draggedIndexRef.current = null;
                                                        setDraggedIndex(null);
                                                    }
                                                }
                                            }}
                                            style={{ touchAction: isActive ? 'none' as any : 'pan-y' }}
                                        >
                                            <div className="flex items-start gap-3 p-4 md:p-5 min-h-[68px]">
                                                <span className="text-base md:text-lg leading-snug text-secondary select-none w-full">{itemText}</span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                );
            default: return null;
        }
    }

    return (
        <div className="question-block">
            {intro && (
                <p className="text-fluid-body text-gray-600 mb-3 md:mb-4 leading-relaxed sm:leading-normal">
                    {intro}
                </p>
            )}
            <h2 className="font-bold mb-5 md:mb-7 text-[clamp(1.35rem,1.05rem+1.8vw,2.05rem)] leading-snug tracking-tight">
                {text}
            </h2>
            {renderInput()}
        </div>
    );
};

export default QuestionDisplay;