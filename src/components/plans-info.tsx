type Props = { placement: "sidebar" | "mobile" };

export function PlansInfo({ placement }: Props) {
  const titleId = `${placement}-plans-title`;
  return <section className={placement === "sidebar" ? "sidebar-plans" : "panel mobile-plans"} aria-labelledby={titleId}>
    <span className="eyebrow">PLANOVI</span>
    <h2 id={titleId}>Cene nakon pilota</h2>
    <p>Basic: EUR 15 po poslovnom prostoru mesečno.</p>
    <p>Premium: EUR 25 po poslovnom prostoru mesečno.</p>
    <p className="subtle">Pilot je besplatan. Nema naplate u aplikaciji.</p>
  </section>;
}
