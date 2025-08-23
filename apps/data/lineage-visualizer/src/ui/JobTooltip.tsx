
import { motion } from "framer-motion";

type JobTooltipProps = {
  job?: {
    id: string;
    name: string;
    transform: string;
    owner?: string;
    updatedAt?: string;
  } | null;
  x: number;
  y: number;
};

export function JobTooltip({ job, x, y }: JobTooltipProps) {
  if (!job) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 rounded-xl bg-gray-800 border border-gray-600 shadow-lg p-3 text-sm text-gray-100 w-64 pointer-events-none"
      style={{ top: y + 12, left: x + 12 }}
    >
      <h3 className="font-semibold text-green-400">{job.name}</h3>
      <p className="text-gray-400 text-xs mb-1">{job.id}</p>
      <p className="text-gray-300">{job.transform}</p>
      {job.owner && (
        <p className="mt-2 text-gray-400 text-xs">Owner: {job.owner}</p>
      )}
      {job.updatedAt && (
        <p className="text-gray-500 text-xs">Updated: {job.updatedAt}</p>
      )}
    </motion.div>
  );
}


