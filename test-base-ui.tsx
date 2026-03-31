import { Select } from "@base-ui/react/select";
export function Test() {
  return (
    <Select.Root defaultValue="val">
      <Select.Trigger><Select.Value /></Select.Trigger>
      <Select.Portal>
        <Select.Popup>
          <Select.Item value="val" label="Displayed Value">
            <Select.ItemText>Displayed Value</Select.ItemText>
          </Select.Item>
        </Select.Popup>
      </Select.Portal>
    </Select.Root>
  );
}
