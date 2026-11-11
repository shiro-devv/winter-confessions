import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { messageFromError } from '../db/errors';
import { useToast } from '../hooks/toast';
import {
  REACTION_KINDS,
  emptyReactionSummary,
  reactionSummary,
  toggleReaction,
  type ReactionKind,
  type ReactionSummary,
} from '../services/confessions';

const EMOJI: Record<ReactionKind, string> = { snowflake: '❄️', heart: '💙', gasp: '😮' };
const LABEL: Record<ReactionKind, string> = { snowflake: 'Snowflake', heart: 'Heart', gasp: 'Gasp' };

interface ReactionBarProps {
  confessionId: string;
  /** When true, counts are shown but nothing can be toggled. */
  readOnly?: boolean;
}

export function ReactionBar({ confessionId, readOnly = false }: ReactionBarProps) {
  const toast = useToast();
  const [summary, setSummary] = useState<ReactionSummary>(emptyReactionSummary);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setSummary(emptyReactionSummary());
    reactionSummary(confessionId).then((next) => {
      if (active) setSummary(next);
    });
    return () => {
      active = false;
    };
  }, [confessionId]);

  const handleToggle = async (kind: ReactionKind) => {
    if (readOnly || busy) return;
    setBusy(true);

    // Show the change immediately, then replace it with the database truth.
    setSummary((current) => {
      const { count, mine } = current[kind];
      return { ...current, [kind]: { count: Math.max(0, count + (mine ? -1 : 1)), mine: !mine } };
    });

    try {
      await toggleReaction(confessionId, kind);
      setSummary(await reactionSummary(confessionId));
    } catch (error) {
      setSummary(await reactionSummary(confessionId));
      toast.show(messageFromError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="reactions" role="group" aria-label="Reactions">
      {REACTION_KINDS.map((kind) => {
        const { count, mine } = summary[kind];
        if (readOnly && count === 0) return null;
        return (
          <motion.button
            key={kind}
            type="button"
            className={`reaction ${mine ? 'reaction-active' : ''}`}
            onClick={() => {
              void handleToggle(kind);
            }}
            disabled={readOnly || busy}
            aria-pressed={readOnly ? undefined : mine}
            aria-label={`${LABEL[kind]} reaction, ${count}`}
            whileHover={readOnly ? undefined : { scale: 1.12 }}
            whileTap={readOnly ? undefined : { scale: 0.88 }}
          >
            <span aria-hidden="true">{EMOJI[kind]}</span>
            <span className="reaction-count">{count}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
