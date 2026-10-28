/** Native catalog entries own their visibility; component previews keep their own layout. */
export function connect(host) {
  const { query, category, count, filters } = host.refs;
  const groups = [...host.element.querySelectorAll('[data-catalog-group]')];
  const items = [...host.element.querySelectorAll('[data-catalog-search]')];
  query.value = '';
  const filter = () => {
    const words = query.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const item of items) {
      item.hidden = !words.every(word => item.dataset.catalogSearch.toLocaleLowerCase().includes(word));
      if (!item.hidden) visible++;
    }
    for (const group of groups) group.hidden = ![...group.querySelectorAll('[data-catalog-search]')].some(item => !item.hidden);
    count.textContent = visible === 0 ? 'No components match. Try another name or section.' : `${visible} component${visible === 1 ? '' : 's'}`;
  };
  const chooseCategory = () => {
    const destination = new URL(category.selectedOptions[0].dataset.href, location.href);
    location.assign(destination.href);
  };
  query.addEventListener('input', filter); category.addEventListener('change', chooseCategory); filter();
  filters.hidden = false;
  return () => { query.removeEventListener('input', filter); category.removeEventListener('change', chooseCategory); };
}
