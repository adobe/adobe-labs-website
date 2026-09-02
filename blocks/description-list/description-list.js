export default function decorate(block) {
  const [headingRow, ...itemRows] = [...block.children];

  const heading = headingRow?.firstElementChild;
  if (heading) heading.className = 'description-list__heading';

  const ul = document.createElement('ul');
  ul.className = 'description-list__items';

  itemRows.forEach((row) => {
    const [term, description] = row.children;
    if (!term) return;

    const li = document.createElement('li');
    li.className = 'description-list__item';

    term.className = 'description-list__item-heading';
    li.append(term);

    if (description) {
      description.className = 'description-list__item-body';
      li.append(description);
    }

    ul.append(li);
  });

  block.replaceChildren(...[heading].filter(Boolean), ul);
}
