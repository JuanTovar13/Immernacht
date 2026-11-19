import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export function InfoModal({ open, onClose, children, capa = "z-30" }: { open: boolean; onClose: () => void; children: ReactNode; capa?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`absolute inset-0 ${capa} flex items-center justify-center px-6`}
          style={{ background: "rgba(2,3,8,0.72)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-[78vh] w-full max-w-sm overflow-y-auto rounded-md border px-6 py-7"
            style={{
              background: "rgba(9,11,22,0.95)",
              borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 40%, transparent)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-sm border px-4 py-2 font-display text-xs tracking-wide"
              style={{
                borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 55%, transparent)",
                color: "var(--color-eclipse-gold)",
              }}
            >
              Cerrar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
