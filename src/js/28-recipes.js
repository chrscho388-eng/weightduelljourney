  // ---- recipes: generated on demand, stored on the meal inside the plan document ----
  const recipeAllowed = () => !!sample || requestMode();
  let openRecipe = null;
  // Only real dishes get recipes: explicit cook flag from the plan, otherwise a guess from name and ingredients.
  const NOT_COOKED = /kantine|juit|lieferdienst|restaurant|auswärts|verkostung|grillabend|einladung|shake|skyr|joghurt|quark mit|obst|snack|kaffee|cappuccino/i;
  function isDish(m) {
    if (m.cook === true) return true;
    if (m.cook === false) return false;
    return !NOT_COOKED.test(m.name || "") && String(m.detail || "").split(",").length >= 3;
  }
  function mealAttrs(m, ref) {
    const tap = ref && isDish(m) && ((m.recipe && (m.recipe.ingredients || []).length) || recipeAllowed());
    return tap ? `class="pmeal tap" data-ref="${ref}" tabindex="0" role="button" aria-label="${esc(m.name)}: Rezept anzeigen"` : `class="pmeal"`;
  }
