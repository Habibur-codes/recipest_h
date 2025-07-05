document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const ingredientTab = document.getElementById('ingredient-tab');
    const nameTab = document.getElementById('name-tab');
    const ingredientPanel = document.getElementById('ingredient-panel');
    const namePanel = document.getElementById('name-panel');
    const ingredientInput = document.getElementById('ingredient-input');
    const addIngredientBtn = document.getElementById('add-ingredient');
    const ingredientTags = document.getElementById('ingredient-tags');
    const generateRecipeBtn = document.getElementById('generate-recipe');
    const recipeNameInput = document.getElementById('recipe-name-input');
    const searchRecipeBtn = document.getElementById('search-recipe');
    const resultsSection = document.getElementById('results-section');
    const recipeGrid = document.getElementById('recipe-grid');
    const loading = document.getElementById('loading');
    const recipeModal = document.getElementById('recipe-modal');
    const closeModal = document.getElementById('close-modal');
    const modalRecipeTitle = document.getElementById('modal-recipe-title');
    const modalRecipeTime = document.getElementById('modal-recipe-time');
    const modalRecipeDiet = document.getElementById('modal-recipe-diet');
    const modalRecipeCuisine = document.getElementById('modal-recipe-cuisine');
    const modalIngredientsList = document.getElementById('modal-ingredients-list');
    const modalInstructionsList = document.getElementById('modal-instructions-list');
    const saveRecipeBtn = document.getElementById('save-recipe');
    const dietFilter = document.getElementById('diet-filter');
    const cuisineFilter = document.getElementById('cuisine-filter');
    const timeFilter = document.getElementById('time-filter');
    const toggleEnglish = document.getElementById('toggle-language');
    const toggleBengali = document.getElementById('toggle-bengali');

    // API Keys
    const SPOONACULAR_API_KEY = 'c0bb037e6bdf477588f365550b26586b';
    const OPENAI_API_KEY = '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';

    // State
    let selectedIngredients = [];
    let currentRecipes = [];
    let currentRecipeDetails = null;
    let currentLanguage = 'en'; // 'en' or 'bn'
    let originalRecipeDetails = null;

    // Initialize the app
    function init() {
        setupEventListeners();
    }

    function setupEventListeners() {
        // Tab Switching
        ingredientTab.addEventListener('click', () => switchTab('ingredient'));
        nameTab.addEventListener('click', () => switchTab('name'));

        // Language Toggle
        toggleEnglish.addEventListener('click', () => switchLanguage('en'));
        toggleBengali.addEventListener('click', () => switchLanguage('bn'));

        // Ingredient Management
        addIngredientBtn.addEventListener('click', addIngredient);
        ingredientInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addIngredient();
        });

        // Recipe Actions
        generateRecipeBtn.addEventListener('click', generateRecipesByIngredients);
        searchRecipeBtn.addEventListener('click', () => {
            const recipeName = recipeNameInput.value.trim();
            if (recipeName) searchRecipesByName(recipeName);
        });
        recipeNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && recipeNameInput.value.trim()) {
                searchRecipesByName(recipeNameInput.value.trim());
            }
        });

        // Modal Actions
        closeModal.addEventListener('click', closeRecipeModal);
        window.addEventListener('click', (event) => {
            if (event.target === recipeModal) closeRecipeModal();
        });
        saveRecipeBtn.addEventListener('click', saveCurrentRecipe);
    }

    function switchTab(tab) {
        if (tab === 'ingredient') {
            ingredientTab.classList.add('active');
            nameTab.classList.remove('active');
            ingredientPanel.classList.add('active');
            namePanel.classList.remove('active');
        } else {
            nameTab.classList.add('active');
            ingredientTab.classList.remove('active');
            namePanel.classList.add('active');
            ingredientPanel.classList.remove('active');
        }
    }

    function switchLanguage(lang) {
        currentLanguage = lang;
        toggleEnglish.classList.toggle('active', lang === 'en');
        toggleBengali.classList.toggle('active', lang === 'bn');
        
        if (currentRecipeDetails) {
            if (lang === 'bn') {
                showLoading();
                translateRecipeToBengali(originalRecipeDetails)
                    .then(translated => {
                        displayRecipeDetails(translated);
                        hideLoading();
                    })
                    .catch(error => {
                        console.error('Translation error:', error);
                        displayRecipeDetails(originalRecipeDetails);
                        hideLoading();
                    });
            } else {
                displayRecipeDetails(originalRecipeDetails);
            }
        }
    }

    function addIngredient() {
        const ingredient = ingredientInput.value.trim().toLowerCase();
        if (ingredient && !selectedIngredients.includes(ingredient)) {
            selectedIngredients.push(ingredient);
            renderIngredientTags();
            ingredientInput.value = '';
        }
    }

    function renderIngredientTags() {
        ingredientTags.innerHTML = '';
        selectedIngredients.forEach(ingredient => {
            const tag = document.createElement('div');
            tag.className = 'ingredient-tag';
            tag.innerHTML = `
                ${ingredient}
                <button class="remove-ingredient" data-ingredient="${ingredient}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            ingredientTags.appendChild(tag);
        });

        document.querySelectorAll('.remove-ingredient').forEach(btn => {
            btn.addEventListener('click', function() {
                selectedIngredients = selectedIngredients.filter(
                    i => i !== this.getAttribute('data-ingredient')
                );
                renderIngredientTags();
            });
        });
    }

    async function generateRecipesByIngredients() {
        if (selectedIngredients.length === 0) {
            alert('Please add at least one ingredient');
            return;
        }

        showLoading();
        
        const diet = dietFilter.value;
        const cuisine = cuisineFilter.value;
        const maxReadyTime = timeFilter.value;
        
        try {
            // Try Spoonacular API first
            let recipes = await fetchRecipesFromSpoonacular(selectedIngredients, diet, cuisine, maxReadyTime);
            
            if (!recipes || recipes.length === 0) {
                // Fallback to AI if Spoonacular fails
                recipes = await generateRecipesWithAI(selectedIngredients, diet, cuisine, maxReadyTime);
            }
            
            currentRecipes = recipes;
            displayRecipes(recipes);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to fetch recipes. Please try again.');
        } finally {
            hideLoading();
        }
    }

    async function searchRecipesByName(query) {
        showLoading();
        
        try {
            // Try Spoonacular API first
            let recipes = await searchRecipesFromSpoonacular(query);
            
            if (!recipes || recipes.length === 0) {
                // Fallback to AI if Spoonacular fails
                recipes = await searchRecipesWithAI(query);
            }
            
            currentRecipes = recipes;
            displayRecipes(recipes);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to search recipes. Please try again.');
        } finally {
            hideLoading();
        }
    }

    // Spoonacular API Functions
    async function fetchRecipesFromSpoonacular(ingredients, diet, cuisine, maxReadyTime) {
        const ingredientsStr = ingredients.join(',+');
        let url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientsStr}&number=6&apiKey=${SPOONACULAR_API_KEY}`;
        
        if (diet) url += `&diet=${diet}`;
        if (cuisine) url += `&cuisine=${cuisine}`;
        if (maxReadyTime) url += `&maxReadyTime=${maxReadyTime}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            return data.map(recipe => ({
                id: recipe.id,
                title: recipe.title,
                image: recipe.image,
                usedIngredients: recipe.usedIngredients,
                missedIngredients: recipe.missedIngredients,
                likes: recipe.likes
            }));
        } catch (error) {
            console.error('Spoonacular error:', error);
            return null;
        }
    }

    async function searchRecipesFromSpoonacular(query) {
        const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=6&apiKey=${SPOONACULAR_API_KEY}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            return data.results.map(recipe => ({
                id: recipe.id,
                title: recipe.title,
                image: recipe.image
            }));
        } catch (error) {
            console.error('Spoonacular error:', error);
            return null;
        }
    }

    async function getRecipeDetailsFromSpoonacular(id) {
        const url = `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=false&apiKey=${SPOONACULAR_API_KEY}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            return {
                title: data.title,
                image: data.image,
                readyInMinutes: data.readyInMinutes,
                servings: data.servings,
                ingredients: data.extendedIngredients.map(ing => ing.original),
                instructions: data.instructions ? data.instructions.replace(/<[^>]*>/g, '') : 'No instructions provided',
                diets: data.diets || [],
                cuisines: data.cuisines || []
            };
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }

    // AI Functions
    async function generateRecipesWithAI(ingredients, diet, cuisine, maxReadyTime) {
        const prompt = `Generate 3 recipes using: ${ingredients.join(', ')}. 
        ${diet ? `Diet: ${diet}. ` : ''}
        ${cuisine ? `Cuisine: ${cuisine}. ` : ''}
        ${maxReadyTime ? `Max time: ${maxReadyTime} mins. ` : ''}
        Provide title, ingredients array, and instructions (steps separated by newlines).
        Return as JSON array with title, ingredients, instructions.`;
        
        try {
            const recipes = await callOpenAI(prompt, false);
            return recipes.map((recipe, index) => ({
                id: `ai-${index}`,
                title: recipe.title,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
                isAI: true
            }));
        } catch (error) {
            console.error('AI error:', error);
            throw error;
        }
    }

    async function searchRecipesWithAI(query) {
        const prompt = `Generate 3 recipes based on: "${query}". 
        Provide title, ingredients array, and instructions (steps separated by newlines).
        Return as JSON array with title, ingredients, instructions.`;
        
        try {
            const recipes = await callOpenAI(prompt, false);
            return recipes.map((recipe, index) => ({
                id: `ai-${index}`,
                title: recipe.title,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
                isAI: true
            }));
        } catch (error) {
            console.error('AI error:', error);
            throw error;
        }
    }

    async function translateRecipeToBengali(recipe) {
        const prompt = `Translate to Bengali (বাংলা):
        Title: ${recipe.title}
        Ingredients: ${recipe.ingredients.join('; ')}
        Instructions: ${recipe.instructions}
        Keep measurements in English.
        Return as JSON with title, ingredients array, instructions.`;
        
        try {
            const translated = await callOpenAI(prompt, true);
            return {
                ...recipe,
                title: translated.title || recipe.title,
                ingredients: translated.ingredients || recipe.ingredients,
                instructions: translated.instructions || recipe.instructions
            };
        } catch (error) {
            console.error('Translation error:', error);
            return recipe;
        }
    }

    async function callOpenAI(prompt, isTranslation) {
        const url = 'https://api.openai.com/v1/chat/completions';
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: isTranslation ? 
                                'You translate recipes to Bengali. Keep measurements in English.' : 
                                'You generate recipes in JSON format.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                })
            });
            
            if (!response.ok) throw new Error('API error');
            
            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('OpenAI error:', error);
            throw error;
        }
    }

    // Display Functions
    function displayRecipes(recipes) {
        recipeGrid.innerHTML = '';
        
        if (!recipes || recipes.length === 0) {
            recipeGrid.innerHTML = '<p class="no-results">No recipes found. Try different search terms.</p>';
            resultsSection.style.display = 'block';
            return;
        }
        
        recipes.forEach(recipe => {
            const recipeCard = document.createElement('div');
            recipeCard.className = 'recipe-card';
            const imageUrl = recipe.image || `https://source.unsplash.com/random/300x200/?food,${encodeURIComponent(recipe.title)}`;
            
            recipeCard.innerHTML = `
                <div class="recipe-img" style="background-image: url('${imageUrl}')"></div>
                <div class="recipe-info">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <div class="recipe-meta">
                        ${recipe.readyInMinutes ? `<span><i class="far fa-clock"></i> ${recipe.readyInMinutes} min</span>` : ''}
                        ${recipe.likes ? `<span><i class="far fa-thumbs-up"></i> ${recipe.likes}</span>` : ''}
                    </div>
                    <p class="recipe-description">
                        ${recipe.missedIngredients ? `Uses ${recipe.usedIngredients?.length || 0} ingredients you have` : ''}
                    </p>
                    <button class="view-recipe" data-id="${recipe.id}" data-is-ai="${recipe.isAI || false}">View Recipe</button>
                </div>
            `;
            
            recipeCard.querySelector('.view-recipe').addEventListener('click', async () => {
                showLoading();
                try {
                    const recipeId = recipe.id;
                    const isAI = recipe.isAI || false;
                    
                    if (isAI) {
                        originalRecipeDetails = {
                            title: recipe.title,
                            ingredients: recipe.ingredients,
                            instructions: recipe.instructions,
                            isAI: true
                        };
                        currentRecipeDetails = originalRecipeDetails;
                    } else {
                        const details = await getRecipeDetailsFromSpoonacular(recipeId);
                        if (details) {
                            originalRecipeDetails = details;
                            currentRecipeDetails = details;
                        }
                    }
                    
                    if (currentLanguage === 'bn' && currentRecipeDetails) {
                        const translated = await translateRecipeToBengali(currentRecipeDetails);
                        displayRecipeDetails(translated);
                    } else if (currentRecipeDetails) {
                        displayRecipeDetails(currentRecipeDetails);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Failed to load recipe details');
                } finally {
                    hideLoading();
                }
            });
            
            recipeGrid.appendChild(recipeCard);
        });
        
        resultsSection.style.display = 'block';
    }

    function displayRecipeDetails(recipe) {
        modalRecipeTitle.textContent = recipe.title;
        
        modalRecipeTime.innerHTML = recipe.readyInMinutes ? 
            `<i class="far fa-clock"></i> ${recipe.readyInMinutes} min` : '';
        
        modalRecipeDiet.innerHTML = recipe.diets?.length > 0 ? 
            `<i class="fas fa-utensils"></i> ${recipe.diets.join(', ')}` : '';
        
        modalRecipeCuisine.innerHTML = recipe.cuisines?.length > 0 ? 
            `<i class="fas fa-globe-americas"></i> ${recipe.cuisines.join(', ')}` : '';
        
        modalIngredientsList.innerHTML = '';
        (recipe.ingredients || []).forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            modalIngredientsList.appendChild(li);
        });
        
        modalInstructionsList.innerHTML = '';
        const instructions = recipe.instructions || 'No instructions provided.';
        const steps = instructions.split(/\n|\d+\./).filter(step => step.trim());
        steps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step.trim();
            modalInstructionsList.appendChild(li);
        });
        
        recipeModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeRecipeModal() {
        recipeModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function saveCurrentRecipe() {
        if (currentRecipeDetails) {
            alert(`Recipe "${currentRecipeDetails.title}" saved!`);
        }
    }

    function showLoading() {
        loading.style.display = 'flex';
        resultsSection.style.display = 'none';
    }

    function hideLoading() {
        loading.style.display = 'none';
    }

    // Initialize the app
    init();
});