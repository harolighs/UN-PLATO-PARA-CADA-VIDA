(function () {
  'use strict';
  const DATA = window.APP_DATA;
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const form = $('#profileForm');
  const detailDialog = $('#detailDialog');
  const dialogContent = $('#dialogContent');
  let currentUser = null;
  let photoPermission = false;
  let exerciseFilter = 'all';
  let mealFilter = 'all';
  let videoFilter = 'all';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function slug(value) { return String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function titleCase(value) { return String(value || '').trim().replace(/\s+/g, ' '); }
  function formatList(items) { return '<ul>' + items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>'; }
  function message(element, text) { element.textContent = text; }

  function setOtherCondition() {
    const isOther = $('#condition').value === 'other';
    $('#otherConditionField').hidden = !isOther;
    $('#otherCondition').required = isOther;
    if (!isOther) $('#otherCondition').value = '';
  }

  function updateBMI() {
    const height = Number($('#height').value) / 100;
    const weight = Number($('#weight').value);
    const age = Number($('#age').value);
    const pregnancy = $('#pregnancy').value;
    const value = $('#bmiValue');
    const copy = $('#bmiPreview b');
    const detail = $('#bmiPreview small');
    const okay = height >= 1 && height <= 2.3 && weight >= 25 && weight <= 300;
    if (!okay) {
      value.textContent = '—'; copy.textContent = 'Tu IMC aparecerá aquí';
      detail.textContent = 'Una referencia educativa, nunca un diagnóstico.'; return null;
    }
    if (pregnancy === 'yes' || pregnancy === 'unsure') {
      value.textContent = '—'; copy.textContent = 'IMC no interpretado';
      detail.textContent = 'El embarazo requiere valoración individual.'; return null;
    }
    const bmi = weight / (height * height);
    value.textContent = bmi.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (age < 20) {
      copy.textContent = 'Resultado numérico, sin clasificación';
      detail.textContent = age < 18 ? 'No usamos el peso para crear un plan para menores.' : 'La interpretación por edad requiere una referencia especializada.';
    } else {
      let band = 'referencia adulta';
      if (bmi < 18.5) band = 'por debajo del rango de referencia adulta';
      else if (bmi < 25) band = 'dentro del rango de referencia adulta';
      else if (bmi < 30) band = 'por encima del rango de referencia adulta';
      else band = 'en un rango que conviene conversar con un profesional';
      copy.textContent = 'IMC ' + band;
      detail.textContent = 'El IMC no diagnostica ni describe por sí solo la salud de una persona.';
    }
    return bmi;
  }

  function collectUser() {
    const fd = new FormData(form);
    return {
      name: titleCase(fd.get('name')), age: Number(fd.get('age')), height: Number(fd.get('height')),
      weight: Number(fd.get('weight')), sleep: Number(fd.get('sleep')), condition: String(fd.get('condition') || 'none'),
      otherCondition: titleCase(fd.get('otherCondition')), otherConditions: titleCase(fd.get('otherConditions')),
      allergies: fd.getAll('allergy').map(String), allergyOther: titleCase(fd.get('allergyOther')),
      medications: titleCase(fd.get('medications')), activity: String(fd.get('activity') || ''),
      goal: String(fd.get('goal') || 'habits'), preference: String(fd.get('preference') || 'all'),
      pregnancy: String(fd.get('pregnancy') || 'no'), redFlags: fd.getAll('redFlag').map(String)
    };
  }
  function hasDeclaredCondition(user) { return user.condition !== 'none' || Boolean(user.otherConditions); }

  function bodyLevels(user) {
    const levels = { nervous: 0, respiratory: 0, cardiovascular: 0, digestive: 0, endocrine: 0, renal: 0, musculoskeletal: 0 };
    if (!user) return levels;
    if (user.age >= 20 && user.sleep < 7) levels.nervous = 1;
    if (user.activity === 'low') { levels.cardiovascular = 1; levels.musculoskeletal = 1; }
    const declared = DATA.conditionMap[user.condition] || {};
    Object.keys(declared).forEach(function (system) { levels[system] = Math.max(levels[system], declared[system]); });
    return levels;
  }
  function updateBody(user) {
    const levels = bodyLevels(user);
    $$('.body-system').forEach(function (node) { node.setAttribute('data-level', String(levels[node.dataset.system] || 0)); });
    if (user && user.condition !== 'none') {
      const mapped = DATA.conditionMap[user.condition] || {};
      showSystem(Object.keys(mapped)[0] || 'nervous');
    } else if (user && user.activity === 'low') showSystem('cardiovascular');
    else showSystem('nervous');
  }
  function showSystem(systemId) {
    const info = DATA.systems[systemId]; if (!info) return;
    $$('.body-system').forEach(function (node) { node.classList.toggle('selected', node.dataset.system === systemId); });
    $('#systemTitle').textContent = info.title; $('#systemFunction').textContent = info.fn;
    $('#systemHabits').textContent = info.habits; $('#systemPrevention').textContent = info.prevention;
  }

  function formIsValid() {
    setOtherCondition();
    if (!form.reportValidity()) return false;
    if ($('#name').value.trim().length < 2) { $('#name').setCustomValidity('Escribe al menos dos caracteres.'); $('#name').reportValidity(); $('#name').setCustomValidity(''); return false; }
    if (Number($('#age').value) < 5 || Number($('#age').value) > 120) { $('#age').setCustomValidity('Ingresa una edad entre 5 y 120 años.'); $('#age').reportValidity(); $('#age').setCustomValidity(''); return false; }
    if (Number($('#height').value) < 100 || Number($('#height').value) > 230) { $('#height').setCustomValidity('Ingresa una altura válida entre 100 y 230 cm.'); $('#height').reportValidity(); $('#height').setCustomValidity(''); return false; }
    if (Number($('#weight').value) < 25 || Number($('#weight').value) > 300) { $('#weight').setCustomValidity('Ingresa un peso válido entre 25 y 300 kg.'); $('#weight').reportValidity(); $('#weight').setCustomValidity(''); return false; }
    if ($('#condition').value === 'other' && !$('#otherCondition').value.trim()) { $('#otherCondition').setCustomValidity('Describe la condición o selecciona otra opción.'); $('#otherCondition').reportValidity(); $('#otherCondition').setCustomValidity(''); return false; }
    return true;
  }
  function safeRecipes(user) {
    return DATA.recipes.filter(function (recipe) {
      const preferenceOkay = user.preference === 'all' || (recipe.preference || []).includes(user.preference) || (user.preference === 'vegetarian' && (recipe.preference || []).includes('vegan'));
      if (!preferenceOkay) return false;
      if ((recipe.allergens || []).some(function (allergen) { return user.allergies.includes(allergen); })) return false;
      if (user.allergyOther) {
        const other = slug(user.allergyOther); const ingredients = slug(recipe.ingredients.join(' '));
        if (other.split(/[ ,/]+/).filter(Boolean).some(function (part) { return part.length > 3 && ingredients.includes(part); })) return false;
      }
      return true;
    });
  }
  function buildHabits(user) {
    const habits = [];
    if (user.age < 18) habits.push('Prioriza rutinas familiares y agradables; conversa sobre salud con un adulto responsable.');
    else if (user.sleep < 7) habits.push('Prueba una hora de desconexión estable antes de dormir y ajusta tu rutina gradualmente.');
    else habits.push('Sostén una rutina de descanso que se adapte a tus horarios y te permita sentirte bien.');
    if (user.activity === 'low') habits.push('Añade pausas breves de movimiento cómodo durante el día; cualquier cantidad cuenta.');
    else habits.push('Mantén las actividades que disfrutas e incorpora pausas y recuperación.');
    if (user.goal === 'food') habits.push('Incluye alimentos variados y de temporada en las comidas que ya preparas.');
    else if (user.goal === 'movement') habits.push('Elige una actividad sencilla que puedas repetir con comodidad esta semana.');
    else habits.push('Escoge un hábito pequeño y sostenible para practicar varios días.');
    return habits;
  }
  function clinicianNeeds(user) { return hasDeclaredCondition(user) || user.pregnancy !== 'no' || Boolean(user.medications) || Boolean(user.allergyOther); }
  function needsClinicalFoodPlan(user) { return user.age < 18 || user.pregnancy !== 'no' || ['diabetes', 'heart', 'hypertension', 'kidney', 'celiac', 'other'].includes(user.condition) || Boolean(user.allergyOther); }

  function renderPlan(user) {
    $('#plan').hidden = false;
    $('#planTitle').textContent = 'Tu guía, ' + user.name.split(' ')[0];
    $('#planSubtitle').textContent = 'Orientación educativa para ' + DATA.goalLabels[user.goal] + '. Todo se calcula localmente en esta pestaña.';
    const emergency = user.redFlags.length > 0;
    const minor = user.age < 18;
    const pregnancy = user.pregnancy !== 'no';
    const condition = hasDeclaredCondition(user);
    const needsReview = clinicianNeeds(user);
    if (emergency) {
      $('#planNotice').className = 'plan-notice notice-emergency';
      $('#planNotice').innerHTML = '<span class="notice-symbol" aria-hidden="true">!</span><div><b>Busca ayuda de emergencia ahora.</b><p>Si estás en Ecuador, llama al <a href="https://www.ecu911.gob.ec/gestion-de-la-atencion-de-emergencias/" target="_blank" rel="noopener noreferrer">9-1-1</a> o pide a alguien cercano que lo haga. No continúes con ejercicio ni esperes a que esta página evalúe tus síntomas.</p></div>';
    } else if (needsReview) {
      $('#planNotice').className = 'plan-notice notice-caution';
      $('#planNotice').innerHTML = '<span class="notice-symbol" aria-hidden="true">i</span><div><b>Personaliza con tu equipo de salud.</b><p>Por la condición, medicamentos, alergias, embarazo o información indicada, esta página no puede determinar restricciones ni cantidades clínicas. Revisa cambios de alimentación o ejercicio con un profesional.</p></div>';
    } else {
      $('#planNotice').className = 'plan-notice notice-good';
      $('#planNotice').innerHTML = '<span class="notice-symbol" aria-hidden="true">✓</span><div><b>Tu guía es educativa y general.</b><p>Usa estas ideas con flexibilidad y elige solo actividades cómodas para ti.</p></div>';
    }
    const bmi = user.age >= 20 && user.pregnancy === 'no' ? user.weight / Math.pow(user.height / 100, 2) : null;
    let summary = 'Objetivo: ' + DATA.goalLabels[user.goal] + '. Edad: ' + user.age + ' años. Sueño declarado: ' + user.sleep + ' horas. ';
    if (bmi !== null) summary += 'IMC numérico: ' + bmi.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg/m², una referencia educativa que no constituye diagnóstico. ';
    else if (minor) summary += 'Por ser menor de edad, no se usa el peso para interpretar resultados ni crear recomendaciones. ';
    else if (pregnancy) summary += 'No se interpreta el IMC durante el embarazo o cuando se prefiere no indicarlo. ';
    summary += needsReview ? 'La orientación no sustituye una revisión con tu equipo de salud.' : 'Puedes cambiar de nuevo tus preferencias cuando quieras.';
    $('#planSummary').textContent = summary;
    const tags = ['<span>' + esc(user.activity === 'low' ? 'Inicio gradual' : user.activity === 'some' ? 'Actividad ocasional' : 'Actividad regular') + '</span>', '<span>' + esc(user.preference === 'all' ? 'Alimentación variada' : user.preference === 'vegan' ? 'Preferencia vegana' : 'Preferencia vegetariana') + '</span>'];
    if (condition) tags.push('<span>Condición declarada · no es evaluación</span>');
    $('#summaryTags').innerHTML = tags.join('');
    $('#habitList').innerHTML = buildHabits(user).map(function (habit, index) { return '<div class="habit-item"><span>0' + (index + 1) + '</span><p>' + esc(habit) + '</p></div>'; }).join('');

    const routineHost = $('#planRoutine');
    let routine = [];
    if (!emergency && !minor && !pregnancy) {
      routine = DATA.exercises.filter(function (exercise) {
        return exercise.lowImpact && (needsReview ? exercise.level === 'beginner' : (user.activity === 'regular' || user.activity === 'some' ? exercise.level !== 'advanced' : exercise.level === 'beginner'));
      }).slice(0, 4);
    }
    $('#routineNote').textContent = emergency ? 'No se generan ejercicios cuando declaras un síntoma de alarma.' : minor ? 'No se crea una rutina personalizada para menores; explora actividades generales con una persona adulta responsable.' : pregnancy ? 'Consulta con tu profesional prenatal antes de usar rutinas o iniciar ejercicio.' : needsReview ? 'Ideas de baja intensidad, no adaptadas a tu diagnóstico o medicación. Pide orientación antes de empezar.' : 'Empieza con una actividad cómoda. La OMS indica que algo de actividad es mejor que nada.';
    if (emergency || minor || pregnancy) routineHost.innerHTML = '<p class="empty-inline">' + esc(emergency ? 'La prioridad es recibir atención.' : minor ? 'Invita a un adulto responsable a elegir actividad recreativa contigo.' : 'Tu equipo prenatal puede recomendar una actividad adecuada para ti.') + '</p>';
    else routineHost.innerHTML = routine.map(function (exercise, index) { return '<div class="mini-row"><span class="mini-number">0' + (index + 1) + '</span><div><b>' + esc(exercise.name) + '</b><small>' + esc(exercise.duration) + ' · ' + esc(exercise.difficulty) + '</small></div><button type="button" class="mini-open" data-exercise="' + esc(exercise.id) + '" aria-label="Ver instrucciones de ' + esc(exercise.name) + '">↗</button></div>'; }).join('');
    const recipes = safeRecipes(user);
    const foodHost = $('#planMeals');
    if (emergency || needsClinicalFoodPlan(user)) {
      const text = emergency ? 'No se muestra una sugerencia de comida durante una posible emergencia.' : minor ? 'No creamos planes alimentarios basados en peso para menores. Comparte hábitos generales con un adulto responsable y un profesional.' : pregnancy ? 'Durante el embarazo, tu profesional puede adaptar las comidas a tus necesidades.' : 'Por la condición o alergia que indicaste, la biblioteca es solo educativa. No se han calculado porciones ni restricciones clínicas.';
      $('#foodPlanNote').textContent = text;
      foodHost.innerHTML = '<p class="empty-inline">' + esc(text) + '</p><a class="inline-link" href="#comidas">Explorar biblioteca de recetas ↗</a>';
    } else {
      $('#foodPlanNote').textContent = 'Cinco momentos flexibles. Cambia ingredientes según disponibilidad y tu apetito; no hay calorías ni restricciones.';
      const meals = ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena'];
      foodHost.innerHTML = meals.map(function (meal) {
        const recipe = recipes.find(function (item) { return item.meal === meal; });
        return '<div class="meal-plan-row"><span>' + esc(meal) + '</span><b>' + esc(recipe ? recipe.name : 'Elige una opción de temporada') + '</b></div>';
      }).join('') || '<p class="empty-inline">No hay opciones disponibles con los filtros actuales. Revisa alergias y preferencias con un profesional.</p>';
    }
    const schedule = [['07:00', 'Desayuno o primera comida, según tu jornada'], ['10:00', 'Pausa y agua si tienes sed'], ['13:00', 'Almuerzo con alimentos variados'], ['15:30', 'Pausa breve de movimiento cómodo'], ['16:30', 'Merienda si forma parte de tu rutina'], ['19:00', 'Cena a una hora que te resulte cómoda'], ['20:30', 'Actividad tranquila y tiempo personal'], ['21:30', 'Bajar el ritmo antes de dormir'], ['22:00', 'Hora de descanso sugerida; ajústala a tus horarios']];
    $('#scheduleList').innerHTML = schedule.map(function (item) { return '<div class="schedule-row"><time>' + esc(item[0]) + '</time><span>' + esc(item[1]) + '</span></div>'; }).join('');
    $('#planFootnote').textContent = emergency ? 'No uses esta guía para manejar síntomas de alarma. El ECU 911 es el canal oficial de emergencias en Ecuador.' : needsReview ? 'No inferimos que una condición esté afectando un órgano. El mapa solo organiza temas educativos relacionados con lo declarado.' : 'El IMC, si aparece, es una medida orientativa y no un diagnóstico. No evaluamos apariencia física.';
  }

  function renderExerciseCards() {
    const query = slug($('#exerciseSearch').value.trim());
    const list = DATA.exercises.filter(function (item) {
      const text = slug([item.name, item.category, item.focus, item.summary, item.difficulty].join(' '));
      let matchesFilter = true;
      if (['beginner', 'intermediate', 'advanced'].includes(exerciseFilter)) matchesFilter = item.level === exerciseFilter;
      else if (exerciseFilter === 'low-impact') matchesFilter = item.lowImpact;
      else if (exerciseFilter === 'no-equipment') matchesFilter = item.equipment === 'Sin equipo' || item.equipment === 'Música opcional';
      return (!query || text.includes(query)) && matchesFilter;
    });
    $('#exerciseGrid').innerHTML = list.map(function (item, index) {
      const icon = item.category === 'Fuerza' ? '◌' : item.category === 'Flexibilidad' ? '✳' : '↗';
      return '<article class="content-card exercise-card"><div class="card-media media-photo tone-' + (index % 4) + '"><span class="image-placeholder" aria-hidden="true">' + icon + '</span><img data-photo="' + esc(item.image) + '" alt="' + esc(item.alt) + '" loading="lazy"><span class="media-tag">' + esc(item.category) + '</span><span class="media-duration">' + esc(item.duration) + '</span></div><div class="content-card-body"><div class="card-meta"><span>' + esc(item.difficulty) + '</span><span>·</span><span>' + esc(item.impact) + '</span></div><h3>' + esc(item.name) + '</h3><p>' + esc(item.summary) + '</p><div class="exercise-detail-line"><span>◈ ' + esc(item.focus) + '</span><span>⌂ ' + esc(item.equipment) + '</span></div><div class="card-actions"><button type="button" class="button button-outline button-small" data-exercise="' + esc(item.id) + '">Ver instrucciones</button>' + (item.videoId ? '<button type="button" class="button button-play button-small" data-video="' + esc(item.videoId) + '">▷ Ver video</button>' : '') + '</div></div></article>';
    }).join('');
    $('#exerciseEmpty').hidden = list.length > 0;
    if (photoPermission) loadPhotos();
  }

  function renderFoodCards() {
    const query = slug($('#foodSearch').value.trim());
    const allergies = currentUser ? currentUser.allergies : [];
    const preference = currentUser ? currentUser.preference : 'all';
    const otherAllergy = currentUser ? currentUser.allergyOther : '';
    const list = DATA.recipes.filter(function (recipe) {
      const mealOkay = mealFilter === 'all' || recipe.meal === mealFilter;
      const text = slug([recipe.name, recipe.meal, recipe.description, recipe.ingredients.join(' '), recipe.market].join(' '));
      const prefOkay = preference === 'all' || (recipe.preference || []).includes(preference) || (preference === 'vegetarian' && (recipe.preference || []).includes('vegan'));
      const allergenOkay = !(recipe.allergens || []).some(function (allergen) { return allergies.includes(allergen); });
      const parts = slug(otherAllergy).split(/[ ,/]+/).filter(function (part) { return part.length > 3; });
      const customOkay = !parts.some(function (part) { return slug(recipe.ingredients.join(' ')).includes(part); });
      return mealOkay && (!query || text.includes(query)) && prefOkay && allergenOkay && customOkay;
    });
    $('#foodGrid').innerHTML = list.map(function (item, index) {
      const preview = item.ingredients.slice(0, 3).map(function (ingredient) { return '<span>' + esc(ingredient.split(',')[0]) + '</span>'; }).join('');
      return '<article class="content-card food-card"><div class="card-media media-photo food-photo tone-' + (index % 5) + '"><span class="image-placeholder" aria-hidden="true">' + (index % 2 ? '✿' : '◉') + '</span><img data-photo="' + esc(item.image) + '" alt="' + esc(item.alt) + '" loading="lazy"><span class="media-tag">' + esc(item.meal) + '</span><span class="media-duration">◷ ' + esc(item.time) + '</span></div><div class="content-card-body"><div class="card-meta"><span>ECUADOR · INGREDIENTES LOCALES</span></div><h3>' + esc(item.name) + '</h3><p>' + esc(item.description) + '</p><div class="ingredient-preview">' + preview + '</div><div class="price-line"><span class="price-symbol">$</span><span><b>Precio por porción</b><small>Sin cotización verificada</small></span><a href="' + esc(DATA.priceSource) + '" target="_blank" rel="noopener noreferrer" aria-label="Consultar precios en SIPA">↗</a></div><div class="card-actions"><button type="button" class="button button-outline button-small" data-recipe="' + esc(item.id) + '">Ver preparación</button><button type="button" class="button button-play button-small" data-video="' + esc(item.videoId) + '">▷ Ver video</button></div></div></article>';
    }).join('');
    $('#foodEmpty').hidden = list.length > 0;
    if (photoPermission) loadPhotos();
  }

  function renderVideoCards() {
    const query = slug($('#videoSearch').value.trim());
    const list = DATA.videos.filter(function (video) {
      const text = slug([video.title, video.description, video.categoryLabel, video.source].join(' '));
      const categoryOkay = videoFilter === 'all' || video.category === videoFilter || (videoFilter === 'training' && video.category === 'exercise');
      return categoryOkay && (!query || text.includes(query));
    });
    $('#videoGrid').innerHTML = list.map(function (video, index) {
      const mark = video.category === 'exercise' ? '↗' : video.category === 'recipe' || video.category === 'food' ? '✳' : '♡';
      return '<article class="video-card"><button type="button" class="video-cover cover-' + (index % 5) + '" data-video="' + esc(video.id) + '" aria-label="Reproducir ' + esc(video.title) + '"><span class="cover-mark" aria-hidden="true">' + mark + '</span><span class="play-circle" aria-hidden="true">▶</span><span class="cover-word">' + esc(video.categoryLabel) + '</span></button><div class="video-card-body"><div class="video-card-meta"><span>' + esc(video.categoryLabel) + '</span><span>' + esc(video.duration) + '</span></div><h3>' + esc(video.title) + '</h3><p>' + esc(video.description) + '</p><div class="video-source">Fuente: ' + esc(video.source) + '</div><button type="button" class="video-link" data-video="' + esc(video.id) + '">Reproducir <span aria-hidden="true">↗</span></button></div></article>';
    }).join('');
    $('#videoEmpty').hidden = list.length > 0;
  }

  function loadPhotos() {
    $$('.media-photo img[data-photo]').forEach(function (img) {
      if (img.getAttribute('src')) return;
      img.addEventListener('load', function () { img.parentElement.classList.add('photo-loaded'); }, { once: true });
      img.addEventListener('error', function () { img.parentElement.classList.add('photo-error'); img.removeAttribute('src'); }, { once: true });
      img.src = img.dataset.photo;
    });
  }
  function renderExerciseDetails(id) {
    const item = DATA.exercises.find(function (exercise) { return exercise.id === id; }); if (!item) return;
    dialogContent.innerHTML = '<div class="dialog-eyebrow">EJERCICIO · ' + esc(item.difficulty.toUpperCase()) + '</div><h2 id="dialogTitle">' + esc(item.name) + '</h2><p class="dialog-lead">' + esc(item.summary) + '</p><div class="dialog-stats"><span><b>Duración</b>' + esc(item.duration) + '</span><span><b>Trabaja</b>' + esc(item.focus) + '</span><span><b>Material</b>' + esc(item.equipment) + '</span></div><h3>Cómo hacerlo</h3>' + formatList(item.steps) + '<div class="dialog-safety"><b>Cuida tu seguridad</b><p>' + esc(item.safety) + '</p></div>' + (item.videoId ? '<button type="button" class="button button-primary" data-video="' + esc(item.videoId) + '">Ver video relacionado ↗</button>' : '');
    if (!detailDialog.open) detailDialog.showModal();
  }
  function renderRecipeDetails(id) {
    const item = DATA.recipes.find(function (recipe) { return recipe.id === id; }); if (!item) return;
    dialogContent.innerHTML = '<div class="dialog-eyebrow">' + esc(item.meal.toUpperCase()) + ' · ECUADOR</div><h2 id="dialogTitle">' + esc(item.name) + '</h2><p class="dialog-lead">' + esc(item.description) + '</p><div class="dialog-stats"><span><b>Preparación</b>' + esc(item.time) + '</span><span><b>Compra sugerida</b>' + esc(item.market) + '</span><span><b>Precio</b>Sin cotización verificada</span></div><div class="recipe-dialog-grid"><div><h3>Ingredientes orientativos</h3>' + formatList(item.ingredients) + '</div><div><h3>Preparación</h3>' + formatList(item.steps) + '</div></div><div class="dialog-safety"><b>Nota sobre costos y salud</b><p>El costo por porción depende de ciudad, mercado, temporada y cantidad comprada. Consulta <a href="' + esc(DATA.priceSource) + '" target="_blank" rel="noopener noreferrer">precios SIPA</a>. Si una condición requiere dieta clínica, las cantidades y restricciones las define tu profesional de salud. Verifica alergias y contaminación cruzada.</p></div><button type="button" class="button button-primary" data-video="' + esc(item.videoId) + '">Ver video relacionado ↗</button><p class="dialog-muted">Video educativo general; puede no mostrar esta receta exacta.</p>';
    if (!detailDialog.open) detailDialog.showModal();
  }
  function openVideo(id) {
    const video = DATA.videos.find(function (item) { return item.id === id; }); if (!video) return;
    dialogContent.innerHTML = '<div class="dialog-eyebrow">' + esc(video.categoryLabel.toUpperCase()) + ' · ' + esc(video.source) + '</div><h2 id="dialogTitle">' + esc(video.title) + '</h2><p class="dialog-lead">' + esc(video.description) + '</p><div class="video-consent-box" id="videoConsentBox"><span aria-hidden="true">ⓘ</span><div><b>YouTube se conectará solo si continúas.</b><p>Al reproducir, YouTube puede recibir datos técnicos de tu conexión. Los datos de tu perfil no se envían ni se incluyen en el enlace.</p></div></div><div class="dialog-safety"><b>Antes de ver</b><p>' + esc(video.safety) + '</p></div><div class="video-player" id="videoPlayer"><button type="button" class="button button-primary" data-play-video="' + esc(video.id) + '">Continuar y reproducir en esta página <span aria-hidden="true">▶</span></button><a href="https://www.youtube.com/watch?v=' + esc(video.youtubeId) + '" target="_blank" rel="noopener noreferrer" class="text-link">Abrir en YouTube ↗</a></div>';
    if (!detailDialog.open) detailDialog.showModal();
  }
  function playVideo(id) {
    const video = DATA.videos.find(function (item) { return item.id === id; }); if (!video) return;
    $('#videoPlayer').innerHTML = '<div class="iframe-wrap"><iframe title="' + esc(video.title) + '" src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(video.youtubeId) + '?autoplay=1&rel=0" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><a href="https://www.youtube.com/watch?v=' + esc(video.youtubeId) + '" target="_blank" rel="noopener noreferrer" class="text-link">Abrir en YouTube ↗</a>';
    $('#videoConsentBox').hidden = true;
  }
  function resetApp() {
    form.reset(); setOtherCondition(); currentUser = null; $('#plan').hidden = true;
    $('#formStatus').textContent = 'Los datos de esta sesión se borraron.';
    $('#bmiValue').textContent = '—'; $('#bmiPreview b').textContent = 'Tu IMC aparecerá aquí';
    $('#bmiPreview small').textContent = 'Una referencia educativa, nunca un diagnóstico.';
    updateBody(null); renderFoodCards(); if (detailDialog.open) detailDialog.close();
  }
  function setFilterButtons(container, selected, attribute) {
    $$('.filter-chip', container).forEach(function (button) {
      const active = button.dataset[attribute] === selected;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  form.addEventListener('input', updateBMI);
  form.addEventListener('change', function (event) { if (event.target.id === 'condition') setOtherCondition(); updateBMI(); });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!formIsValid()) { message($('#formStatus'), 'Revisa los campos marcados antes de continuar.'); return; }
    currentUser = collectUser(); updateBMI(); updateBody(currentUser); renderFoodCards(); renderPlan(currentUser);
    message($('#formStatus'), 'Tu guía se generó en esta pestaña. No guardamos tu perfil.');
    window.setTimeout(function () { $('#plan').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  });
  $('#demoButton').addEventListener('click', function () {
    $('#name').value = 'Alex'; $('#age').value = '34'; $('#height').value = '168'; $('#weight').value = '67';
    $('#sleep').value = '7.5'; $('#condition').value = 'none'; $('#otherCondition').value = ''; $('#otherConditions').value = '';
    $('#allergyOther').value = ''; $('#medications').value = ''; $('#activity').value = 'low'; $('#goal').value = 'habits';
    $('#preference').value = 'all'; $('#pregnancy').value = 'no'; $('#acknowledge').checked = true;
    $$('input[name="allergy"], input[name="redFlag"]').forEach(function (input) { input.checked = false; });
    setOtherCondition(); updateBMI(); form.requestSubmit();
  });
  $('#clearButton').addEventListener('click', resetApp);
  $('#regenerateButton').addEventListener('click', function () { if (currentUser) { renderPlan(currentUser); $('#plan').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  $('#printButton').addEventListener('click', function () { window.print(); });
  $('#themeToggle').addEventListener('click', function () {
    const dark = document.body.classList.toggle('theme-dark');
    $('#themeToggle').setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    $('#themeToggle').setAttribute('aria-pressed', dark ? 'true' : 'false');
  });
  $('#loadPhotosButton').addEventListener('click', function () {
    photoPermission = true; loadPhotos(); $('#photoConsent').classList.add('photo-enabled');
    $('#photoConsent p').textContent = 'Fotografías activadas para esta sesión. Tu perfil no se envía.';
    $('#loadPhotosButton').textContent = 'Fotografías activadas'; $('#loadPhotosButton').disabled = true;
  });
  $('#exerciseSearch').addEventListener('input', renderExerciseCards);
  $('#foodSearch').addEventListener('input', renderFoodCards);
  $('#videoSearch').addEventListener('input', renderVideoCards);
  $('#exerciseFilters').addEventListener('click', function (event) {
    const button = event.target.closest('[data-filter]'); if (!button) return;
    exerciseFilter = button.dataset.filter; setFilterButtons($('#exerciseFilters'), exerciseFilter, 'filter'); renderExerciseCards();
  });
  $('#mealFilters').addEventListener('click', function (event) {
    const button = event.target.closest('[data-meal]'); if (!button) return;
    mealFilter = button.dataset.meal; setFilterButtons($('#mealFilters'), mealFilter, 'meal'); renderFoodCards();
  });
  $('#videoFilters').addEventListener('click', function (event) {
    const button = event.target.closest('[data-category]'); if (!button) return;
    videoFilter = button.dataset.category; setFilterButtons($('#videoFilters'), videoFilter, 'category'); renderVideoCards();
  });
  document.addEventListener('click', function (event) {
    const close = event.target.closest('[data-close-dialog]'); if (close) { detailDialog.close(); return; }
    const play = event.target.closest('[data-play-video]'); if (play) { playVideo(play.dataset.playVideo); return; }
    const videoButton = event.target.closest('[data-video]'); if (videoButton) { openVideo(videoButton.dataset.video); return; }
    const exerciseButton = event.target.closest('[data-exercise]'); if (exerciseButton) { renderExerciseDetails(exerciseButton.dataset.exercise); return; }
    const recipeButton = event.target.closest('[data-recipe]'); if (recipeButton) { renderRecipeDetails(recipeButton.dataset.recipe); return; }
  });
  detailDialog.addEventListener('click', function (event) { if (event.target === detailDialog) detailDialog.close(); });
  detailDialog.addEventListener('close', function () { dialogContent.replaceChildren(); });
  $$('.body-system').forEach(function (node) {
    node.addEventListener('click', function () { showSystem(node.dataset.system); });
    node.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showSystem(node.dataset.system); } });
    node.addEventListener('focus', function () { showSystem(node.dataset.system); });
  });

  setOtherCondition(); updateBMI(); updateBody(null); renderExerciseCards(); renderFoodCards(); renderVideoCards();
})();

