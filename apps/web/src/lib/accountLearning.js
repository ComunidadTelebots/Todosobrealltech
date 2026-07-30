export const ACCOUNT_LEARNING_MODULES = Object.freeze([
  {
    id: 'account-basics',
    title: 'Primeros pasos con cuentas',
    summary: 'Aprende a identificar una cuenta y revisar su estado antes de actuar.',
    lessons: [
      {
        id: 'account-profile',
        title: 'Reconocer el perfil',
        durationMinutes: 3,
        explanation: 'Revisa el nombre, el identificador y el estado de la cuenta para confirmar que estás trabajando con el perfil correcto.',
        context: 'Úsalo antes de editar datos o aplicar una configuración.',
      },
      {
        id: 'account-status',
        title: 'Interpretar el estado',
        durationMinutes: 4,
        explanation: 'Los estados resumen si una cuenta está activa, limitada o pendiente. Comprueba el detalle antes de tomar decisiones.',
        context: 'Es especialmente útil cuando una acción aparece deshabilitada.',
      },
    ],
  },
  {
    id: 'account-preferences',
    title: 'Preferencias personales',
    summary: 'Configura el panel para trabajar con comodidad sin afectar a otras cuentas.',
    lessons: [
      {
        id: 'language-and-direction',
        title: 'Idioma y dirección',
        durationMinutes: 3,
        explanation: 'El idioma ayuda a interpretar el contenido y la dirección adapta la lectura para idiomas de derecha a izquierda.',
        context: 'Configúralo por cuenta cuando distintos equipos usan idiomas diferentes.',
      },
      {
        id: 'density-and-accessibility',
        title: 'Densidad y accesibilidad',
        durationMinutes: 4,
        explanation: 'La densidad controla el espacio visible; las opciones de accesibilidad priorizan legibilidad, contraste y movimiento reducido.',
        context: 'Elige una vista cómoda para leer o compacta para revisar listas extensas.',
      },
    ],
  },
  {
    id: 'account-safety',
    title: 'Trabajo seguro',
    summary: 'Confirma el alcance y protege información sensible antes de realizar cambios.',
    lessons: [
      {
        id: 'privacy-review',
        title: 'Revisar datos privados',
        durationMinutes: 4,
        explanation: 'Muestra datos sensibles solo cuando sean necesarios y evita copiarlos a canales que no estén autorizados.',
        context: 'Activa la protección visual si compartes pantalla o trabajas en un espacio público.',
      },
      {
        id: 'safe-changes',
        title: 'Confirmar cambios',
        durationMinutes: 5,
        explanation: 'Comprueba la cuenta, el alcance y el resultado esperado antes de guardar una acción que afecte a otras personas.',
        context: 'Detente y revisa cuando una acción sea irreversible o cambie permisos.',
      },
    ],
  },
]);

export const ACCOUNT_LESSONS = Object.freeze(
  ACCOUNT_LEARNING_MODULES.flatMap((module) => module.lessons),
);

export const getAccountLearningStorageKey = (userId) => (
  `account-learning:${encodeURIComponent(String(userId || 'guest'))}`
);

export const createAccountLearningProgress = () => ({
  currentLessonId: ACCOUNT_LESSONS[0]?.id || null,
  completedLessonIds: [],
});

const lessonIds = new Set(ACCOUNT_LESSONS.map(({ id }) => id));

export const normalizeAccountLearningProgress = (value) => {
  const fallback = createAccountLearningProgress();
  if (!value || typeof value !== 'object') return fallback;

  const completedLessonIds = Array.from(new Set(
    Array.isArray(value.completedLessonIds)
      ? value.completedLessonIds.filter((id) => lessonIds.has(id))
      : [],
  ));
  const currentLessonId = lessonIds.has(value.currentLessonId)
    ? value.currentLessonId
    : fallback.currentLessonId;

  return { currentLessonId, completedLessonIds };
};

export const readAccountLearningProgress = (userId, storage) => {
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!targetStorage) return createAccountLearningProgress();

  try {
    return normalizeAccountLearningProgress(JSON.parse(
      targetStorage.getItem(getAccountLearningStorageKey(userId)) || 'null',
    ));
  } catch {
    return createAccountLearningProgress();
  }
};

export const saveAccountLearningProgress = (userId, progress, storage) => {
  const normalized = normalizeAccountLearningProgress(progress);
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  try {
    targetStorage?.setItem(getAccountLearningStorageKey(userId), JSON.stringify(normalized));
  } catch {
    // Learning remains available in memory when persistent storage is disabled.
  }
  return normalized;
};

export const getNextAccountLessonId = (lessonId) => {
  const index = ACCOUNT_LESSONS.findIndex(({ id }) => id === lessonId);
  return index >= 0 && index < ACCOUNT_LESSONS.length - 1
    ? ACCOUNT_LESSONS[index + 1].id
    : null;
};
