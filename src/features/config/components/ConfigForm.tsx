import { Button, Input } from "@heroui/react";

export function ConfigForm() {
  return (
    <div className="flex flex-col gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
      <h3 className="text-sm font-bold text-zinc-200">Site Profile Configuration</h3>
      <Input label="Cookies File Path" placeholder="/path/to/cookies.txt" size="sm" />
      <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
        Save Profile
      </Button>
    </div>
  );
}
