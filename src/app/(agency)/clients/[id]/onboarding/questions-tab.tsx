"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { OnboardingQuestion } from "./question-actions";
import {
  updateQuestionText,
  toggleQuestionActive,
  deleteQuestion,
  addQuestion,
  reorderQuestions,
} from "./question-actions";

interface QuestionsTabProps {
  clientId: string;
  initialQuestions: OnboardingQuestion[];
}

export function QuestionsTab({ clientId, initialQuestions }: QuestionsTabProps) {
  const [questions, setQuestions] = useState(initialQuestions);

  const perfQuestions = questions
    .filter((q) => q.section === "performance")
    .sort((a, b) => a.order_index - b.order_index);
  const creativeQuestions = questions
    .filter((q) => q.section === "creative")
    .sort((a, b) => a.order_index - b.order_index);

  const handleUpdate = useCallback((id: string, updates: Partial<OnboardingQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const handleAdd = useCallback((newQuestion: OnboardingQuestion) => {
    setQuestions((prev) => [...prev, newQuestion]);
  }, []);

  const handleReorder = useCallback(
    (section: "performance" | "creative", reordered: OnboardingQuestion[]) => {
      setQuestions((prev) => {
        const other = prev.filter((q) => q.section !== section);
        return [...other, ...reordered];
      });
    },
    []
  );

  return (
    <div className="space-y-10">
      <QuestionSection
        clientId={clientId}
        section="performance"
        label="Performance"
        questions={perfQuestions}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onReorder={handleReorder}
      />
      <QuestionSection
        clientId={clientId}
        section="creative"
        label="Creative"
        questions={creativeQuestions}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onReorder={handleReorder}
      />
    </div>
  );
}

// ---------- Question Section ----------

function QuestionSection({
  clientId,
  section,
  label,
  questions,
  onUpdate,
  onDelete,
  onAdd,
  onReorder,
}: {
  clientId: string;
  section: "performance" | "creative";
  label: string;
  questions: OnboardingQuestion[];
  onUpdate: (id: string, updates: Partial<OnboardingQuestion>) => void;
  onDelete: (id: string) => void;
  onAdd: (q: OnboardingQuestion) => void;
  onReorder: (section: "performance" | "creative", reordered: OnboardingQuestion[]) => void;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (addingNew && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [addingNew]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({
        ...q,
        order_index: i + 1,
      }));

      onReorder(section, reordered);

      await reorderQuestions(
        reordered.map((q) => ({ id: q.id, order_index: q.order_index }))
      );
    },
    [questions, section, onReorder]
  );

  const handleAddQuestion = useCallback(async () => {
    if (!newText.trim()) return;
    setSaving(true);
    const nextOrder = questions.length > 0
      ? Math.max(...questions.map((q) => q.order_index)) + 1
      : 1;

    const result = await addQuestion({
      clientId,
      section,
      questionText: newText.trim(),
      orderIndex: nextOrder,
    });

    if (!result.error && result.data) {
      onAdd(result.data);
      setNewText("");
      setAddingNew(false);
    }
    setSaving(false);
  }, [clientId, section, newText, questions, onAdd]);

  const activeCount = questions.filter((q) => q.is_active).length;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
        <span className="text-sm text-gray-500">
          {activeCount} active / {questions.length} total
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {questions.map((q, i) => (
              <SortableQuestionRow
                key={q.id}
                question={q}
                index={i + 1}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add question */}
      {addingNew ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={newInputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddQuestion();
              if (e.key === "Escape") {
                setAddingNew(false);
                setNewText("");
              }
            }}
            placeholder="Type your question..."
            className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066FF] focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
          />
          <button
            onClick={handleAddQuestion}
            disabled={saving || !newText.trim()}
            className="rounded-md bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add"}
          </button>
          <button
            onClick={() => {
              setAddingNew(false);
              setNewText("");
            }}
            className="rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#0066FF] hover:text-[#0052cc]"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      )}
    </section>
  );
}

// ---------- Sortable Question Row ----------

function SortableQuestionRow({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: OnboardingQuestion;
  index: number;
  onUpdate: (id: string, updates: Partial<OnboardingQuestion>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(question.question_text);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSaveText = useCallback(async () => {
    setEditing(false);
    const trimmed = editText.trim();
    if (!trimmed || trimmed === question.question_text) {
      setEditText(question.question_text);
      return;
    }
    onUpdate(question.id, { question_text: trimmed });
    await updateQuestionText(question.id, trimmed);
  }, [editText, question.id, question.question_text, onUpdate]);

  const handleToggle = useCallback(async () => {
    const newActive = !question.is_active;
    onUpdate(question.id, { is_active: newActive });
    await toggleQuestionActive(question.id, newActive);
  }, [question.id, question.is_active, onUpdate]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    const result = await deleteQuestion(question.id);
    if (!result.error) {
      onDelete(question.id);
    }
    setDeleting(false);
    setDeleteOpen(false);
  }, [question.id, onDelete]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-colors ${
          isDragging
            ? "z-50 border-[#0066FF] shadow-md"
            : "border-gray-200 hover:border-gray-300"
        } ${!question.is_active ? "opacity-50" : ""}`}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Question number */}
        <span className="w-6 shrink-0 text-right text-sm font-medium text-gray-400">
          {index}
        </span>

        {/* Question text / inline edit */}
        {editing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveText}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveText();
              if (e.key === "Escape") {
                setEditText(question.question_text);
                setEditing(false);
              }
            }}
            className="flex-1 rounded border border-[#0066FF] bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-sm text-gray-900 hover:text-[#0066FF]"
          >
            {question.question_text}
          </button>
        )}

        {/* Toggle active */}
        <button
          onClick={handleToggle}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            question.is_active ? "bg-[#0066FF]" : "bg-gray-200"
          }`}
          title={question.is_active ? "Disable question" : "Enable question"}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              question.is_active ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>

        {/* Delete */}
        <button
          onClick={() => setDeleteOpen(true)}
          className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          title="Delete question"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete question?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this question. Any existing responses
            to it will remain in the database but won&apos;t appear in the form.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}
