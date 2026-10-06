"use client";

import Link from "next/link";
import clsx from "clsx";
import type { Task } from "@/lib/types";
import { toggleTask } from "@/app/actions/deals";
import { useAction } from "@/components/actions";
import { fmtDate } from "@/components/ui";

export function TodayTask({ task, overdue }: { task: Task; overdue: boolean }) {
  const { pending, exec } = useAction();
  return (
    <li className={clsx("flex items-start gap-2 text-sm", pending && "opacity-50")}>
      <input type="checkbox" className="mt-1 accent-brand-600" onChange={(e) => exec(() => toggleTask(task.id, e.target.checked))} />
      <div className="min-w-0">
        {task.deal_id ? (
          <Link href={`/deals/${task.deal_id}`} className="hover:underline">
            {task.title}
          </Link>
        ) : (
          task.title
        )}
        <div className={clsx("text-xs", overdue ? "text-red-600" : "text-slate-500")}>
          {task.owner_label && `${task.owner_label} · `}
          {task.due_date ? fmtDate(task.due_date) : "no date"}
        </div>
      </div>
    </li>
  );
}
