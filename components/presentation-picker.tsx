import type { Product } from "@/lib/types";
import { presentations } from "@/lib/demo-catalog";
import { money } from "@/lib/cart";

export function PresentationPicker({
  product,
  selected,
  onSelect,
  name,
}: {
  product: Product;
  selected: string;
  onSelect: (id: string) => void;
  name: string;
}) {
  const options = presentations(product);
  if (options.length === 1 && !options[0].example) return null;
  return (
    <fieldset className="presentation-picker">
      <legend>Elige una presentación</legend>
      <div className="presentation-options">
        {options.map((option) => (
          <label
            key={option.id}
            className={selected === option.id ? "is-selected" : ""}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
            />
            <span>{option.label}</span>
            <strong>
              {option.priceCents === null
                ? "Por cotizar"
                : money(option.priceCents)}
            </strong>
          </label>
        ))}
      </div>
      {options.some((option) => option.example) && (
        <p>
          Presentaciones y precios de muestra. Los reales se confirman por
          WhatsApp.
        </p>
      )}
    </fieldset>
  );
}
