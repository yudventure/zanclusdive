// Picks an option from a searchable dropdown (SearchSelect in the admin):
// types the words into the field, then taps the option that matches.
// "exact" asks for the option's whole name.
export async function choose(field, words, { option = words, exact } = {}) {
  await field.click();
  await field.fill(words);
  await field
    .page()
    .getByRole("option", { name: option, exact })
    .first()
    .click();
}
