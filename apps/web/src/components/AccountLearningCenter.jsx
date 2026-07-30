import React, { useEffect, useId, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  ACCOUNT_LEARNING_MODULES,
  ACCOUNT_LESSONS,
  createAccountLearningProgress,
  getNextAccountLessonId,
  readAccountLearningProgress,
  saveAccountLearningProgress,
} from '../lib/accountLearning';

const AccountLearningCenter = ({ userId, className = '', onProgressChange }) => {
  const titleId = useId();
  const [progress, setProgress] = useState(() => readAccountLearningProgress(userId));

  useEffect(() => {
    setProgress(readAccountLearningProgress(userId));
  }, [userId]);

  const currentLesson = useMemo(
    () => ACCOUNT_LESSONS.find(({ id }) => id === progress.currentLessonId) || ACCOUNT_LESSONS[0],
    [progress.currentLessonId],
  );
  const completed = new Set(progress.completedLessonIds);
  const percentage = ACCOUNT_LESSONS.length
    ? Math.round((completed.size / ACCOUNT_LESSONS.length) * 100)
    : 0;

  const updateProgress = (next) => {
    const saved = saveAccountLearningProgress(userId, next);
    setProgress(saved);
    onProgressChange?.(saved);
  };

  const openLesson = (lessonId) => updateProgress({ ...progress, currentLessonId: lessonId });

  const completeCurrentLesson = () => {
    if (!currentLesson) return;
    const completedLessonIds = [...new Set([...progress.completedLessonIds, currentLesson.id])];
    updateProgress({
      completedLessonIds,
      currentLessonId: getNextAccountLessonId(currentLesson.id) || currentLesson.id,
    });
  };

  const resetProgress = () => updateProgress(createAccountLearningProgress());

  return (
    <section className={`space-y-4 rounded-xl border bg-background p-4 ${className}`} aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={titleId} className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          Centro de aprendizaje de cuentas
        </h3>
        <button type="button" onClick={resetProgress} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          <RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" />
          Reiniciar
        </button>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{completed.size} de {ACCOUNT_LESSONS.length} lecciones</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage} aria-label="Progreso del aprendizaje">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <nav aria-label="Módulos de aprendizaje" className="space-y-3">
          {ACCOUNT_LEARNING_MODULES.map((module) => (
            <div key={module.id} className="rounded-lg border p-3">
              <h4 className="text-sm font-semibold">{module.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{module.summary}</p>
              <ul className="mt-2 space-y-1">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => openLesson(lesson.id)}
                      aria-current={currentLesson?.id === lesson.id ? 'step' : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${currentLesson?.id === lesson.id ? 'bg-muted font-medium' : ''}`}
                    >
                      <span>{lesson.title}</span>
                      {completed.has(lesson.id) ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completada" /> : <span className="text-xs text-muted-foreground">{lesson.durationMinutes} min</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {currentLesson && (
          <article className="rounded-lg border p-4" aria-live="polite">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Continuar aprendiendo</p>
            <h4 className="mt-1 text-lg font-semibold">{currentLesson.title}</h4>
            <p className="mt-3 text-sm leading-6">{currentLesson.explanation}</p>
            <aside className="mt-4 rounded-md bg-muted p-3" aria-label="Explicación contextual">
              <p className="text-xs font-semibold">Cuándo aplicarlo</p>
              <p className="mt-1 text-sm">{currentLesson.context}</p>
            </aside>
            <button
              type="button"
              onClick={completeCurrentLesson}
              disabled={completed.has(currentLesson.id)}
              className="mt-4 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completed.has(currentLesson.id) ? 'Lección completada' : 'Marcar como completada'}
            </button>
          </article>
        )}
      </div>
    </section>
  );
};

export default AccountLearningCenter;
