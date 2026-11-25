"use client";

import { useState } from "react";
import { ChevronRight, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionConfig } from "./LandingSectionEditor";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TreeNode =
  | {
      id: string;
      label: string;
      icon?: LucideIcon;
      type: "group";
      children: TreeNode[];
      section?: never;
      slug?: never;
      pageTitle?: never;
      description?: never;
    }
  | {
      id: string;
      label: string;
      icon?: LucideIcon;
      type: "section";
      section: SectionConfig;
      children?: never;
      slug?: never;
      pageTitle?: never;
      description?: never;
    }
  | {
      id: string;
      label: string;
      icon?: LucideIcon;
      type: "richpage";
      slug: string;
      pageTitle?: string;
      description?: string;
      section?: never;
      children?: never;
    };

interface CmsTreeProps {
  nodes: TreeNode[];
  selected: TreeNode | null;
  onSelect: (node: TreeNode) => void;
  /** Called after selecting a leaf on mobile so the drawer can close */
  onClose?: () => void;
}

// ── Tree items ────────────────────────────────────────────────────────────────

function TreeGroup({
  node, selected, onSelect, onClose, depth,
}: {
  node: TreeNode & { type: "group" };
  selected: TreeNode | null;
  onSelect: (node: TreeNode) => void;
  onClose?: () => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-md",
          "text-muted-foreground hover:text-foreground transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          depth > 0 && "pl-5",
        )}
      >
        <ChevronRight
          className={cn("size-3 shrink-0 transition-transform duration-200", open && "rotate-90")}
          aria-hidden="true"
        />
        {node.icon && <node.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <span>{node.label}</span>
      </button>

      {open && (
        <div role="group" aria-label={node.label}>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              selected={selected}
              onSelect={onSelect}
              onClose={onClose}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeLeaf({
  node, selected, onSelect, onClose, depth,
}: {
  node: TreeNode & { type: "section" | "richpage" };
  selected: TreeNode | null;
  onSelect: (node: TreeNode) => void;
  onClose?: () => void;
  depth: number;
}) {
  const isActive = selected?.id === node.id;

  return (
    <button
      type="button"
      onClick={() => { onSelect(node); onClose?.(); }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-md transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        // deeper indent on desktop, same on mobile (already in a drawer)
        depth > 0 && "pl-7",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:text-foreground hover:bg-muted/60",
      )}
    >
      {node.icon && <node.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <span className="truncate">{node.label}</span>
    </button>
  );
}

function TreeItem({
  node, selected, onSelect, onClose, depth,
}: {
  node: TreeNode;
  selected: TreeNode | null;
  onSelect: (node: TreeNode) => void;
  onClose?: () => void;
  depth: number;
}) {
  if (node.type === "group") {
    return <TreeGroup node={node} selected={selected} onSelect={onSelect} onClose={onClose} depth={depth} />;
  }
  return <TreeLeaf node={node} selected={selected} onSelect={onSelect} onClose={onClose} depth={depth} />;
}

// ── Tree list (shared between sidebar and drawer) ─────────────────────────────

function TreeList({ nodes, selected, onSelect, onClose }: CmsTreeProps) {
  return (
    <nav aria-label="CMS навігація" className="flex flex-col gap-0.5 p-2">
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} selected={selected} onSelect={onSelect} onClose={onClose} depth={0} />
      ))}
    </nav>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function CmsTreeSidebar({ nodes, selected, onSelect }: CmsTreeProps) {
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card overflow-y-auto">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Редактор сайту</p>
      </div>
      <TreeList nodes={nodes} selected={selected} onSelect={onSelect} />
    </aside>
  );
}

// ── Mobile bottom sheet ───────────────────────────────────────────────────────

export function CmsTreeDrawer({
  nodes, selected, onSelect, open, onClose,
}: CmsTreeProps & { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="CMS навігація"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-2xl",
          "flex flex-col overflow-hidden transition-transform duration-300 ease-in-out md:hidden",
          "max-h-[75svh]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* Handle + header */}
        <div className="flex flex-col items-center px-4 pt-3 pb-2 border-b border-border shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-3" aria-hidden="true" />
          <div className="w-full flex items-center justify-between">
            <p className="text-sm font-semibold">Редактор сайту</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити меню"
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable tree */}
        <div className="flex-1 overflow-y-auto">
          <TreeList nodes={nodes} selected={selected} onSelect={onSelect} onClose={onClose} />
        </div>
      </div>
    </>
  );
}

// ── Legacy export (kept for any direct imports) ───────────────────────────────
export { TreeList as CmsTree };
