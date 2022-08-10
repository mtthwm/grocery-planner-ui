
const GroceryList = function (container, initialList=[]) {
    this._container = container;
    this._list = initialList;

    this._renderProduct = (product, index) => {
        return(`
            <li class="list-li">
                <div class="row">
                    <p>${product.description}</p>
                    <div class="ml-auto row align-center">
                        <div class="thumbnail-container"><img class="thumbnail" src="${product.thumbnail}"/></div>
                        <button class="list-remove btn btn-close" data-index="${index}">&#10006;</button>
                    </div>
                </div>
            </li>
        `)
    };

    this._removeIndex = (index) => {
        this._list.splice(index, 1);
        this.render();
    }

    this._applyEventListeners = () => {
        this._container.querySelectorAll('.list-remove').forEach(element => element.addEventListener('click', event => {
            this._removeIndex(event.target.getAttribute('data-index'));
        }));
    };

    this._totalPrice = () => {
        let total = 0;
        this._list.forEach(item => {
            console.log(item);
            return total += Number(item.price);
        });
        return total.toFixed(2);
    };

    this.getList = () => {
        return this._list;
    };  

    this.add = (item) => {
        this._list.push(item);
        this.render();
    };

    this.remove = (item) => {
        const index = this._list.findIndex(element => {
            return JSON.stringify(element) === JSON.stringify(item);
        });
        this._removeIndex(index);
    };

    this.clear = () => {
        this._list = [];
        this.render();
    };

    this.render = () => {
        const content = this._list.map((item, index) => {
            return this._renderProduct(item, index)
        }).join('');
        this._container.innerHTML = content;  
        const totalPrice = document.getElementById('total-price')
        totalPrice.textContent = `$${this._totalPrice()}`;
        this._applyEventListeners();
    };

    this.initialize = async () => {
        const accessToken = window.localStorage.getItem('kroger_access_token');
        const response = await fetch(config.GET_LIST_URL, {
            method: 'POST',
            body: JSON.stringify({
                accessToken: accessToken,
            })
        });
        if (response.status == 404)
        {
            this.render();
            return;
        }
        const responseJson = await response.json();
        const list = responseJson.list;

        this._list = list.items;
        window.localStorage.setItem('kroger_location_id', list.location);

        this.render();
    };
};

const VisibilityController = function (elements) {
    this._elements = elements;
    this._currentIndex = 0;

    this._updateVisibility = () => {
        this._elements.forEach((element, index) => {
            if (index === this._currentIndex) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }

    this.select = (index) => {
        this._currentIndex = index;
        this._updateVisibility();
    };

    this.cycle = (places=1) => {
        this._currentIndex = (this._currentIndex + places) % this._elements.length;
        this._updateVisibility();
    };

    this._updateVisibility();
}

// Render functions
const renderLocation = (location) => {
    return (`<div class="search-dropdown-item" data-location-id="${location.locationId}"><p>${location.name}</p></div>`);
};

const renderProducts = (product) => {
    const item = product.items[0];
    const thumbnailUrl = product.images[0].sizes.find(image => image.size === 'thumbnail').url;
    const onPromo = item.price.promo > 0;
    const promoPrice = item.price.promo;
    const regularPrice = item.price.regular;
    const price = onPromo ? promoPrice : regularPrice; 
    return (`
    <div class="search-dropdown-item" 
    data-product-description="${product.description}" 
    data-product-thumbnail="${thumbnailUrl}"
    data-product-id="${product.productId}"
    data-product-size="${product.items[0].size}"
    data-product-price="${price}">
        <div class="row align-center">
            <p>${product.description}</p>
            <p class="ml-auto">${onPromo ? `<del>${regularPrice}</del> <mark>${price}</mark>` : `${price}`}</p>
            <img src=${thumbnailUrl}/>
        </div>
    </div>`);
}

// Main function
window.onload = async () => {
    const saveButton = document.getElementById('save-list-button');
    const clearButton = document.getElementById('clear-list-button');

    const groceryList = new GroceryList(document.querySelector('#item-container > .list-container'));
    await groceryList.initialize();

    const productClickHandler = (event) => {
        const origin = event.target;
        const dataObject = elementToDataObject(origin);
        const data = dataObject.product;
        groceryList.add(data);
    }

    const saveList = async () => {
        const items = groceryList.getList();
        const location = window.localStorage.getItem('kroger_location_id');
        const accessToken = window.localStorage.getItem('kroger_access_token');

        const list = {location, items};
        
        const response = await fetch(config.SAVE_LIST_URL, {
            method: 'POST',
            body: JSON.stringify({
                accessToken,
                list,
            })
        });

        if (response && response.status == 200) {
            const responseJson = await response.json();
            
            if (responseJson && responseJson.list)
            {
                alert('Your list was saved successfully!')
            }
        } else {
            alert('There was an error with your list');
        }
    }

    const clearList = () => {
        groceryList.clear();
    };
    
    saveButton.addEventListener('click', saveList);
    clearButton.addEventListener('click', clearList)

    setUpSearchDropdown(document.getElementById('location-selector'), lookupLocations, renderLocation, locationClickHandler);
    setUpSearchDropdown(document.getElementById('add-container'), lookupProducts, renderProducts, productClickHandler);

    // const locationSelection = new VisibilityController([document.getElementById('location-selector'), document.getElementById('location-button')]);
}

const setUpSearchDropdown = async (container, obtainListCallback, renderCallback, clickCallback) => {
    const input = container.querySelector('.search-dropdown-input');
    const resultContainer = container.querySelector('.search-dropdown-container');

    setupDelayedChangeInput(input, async (value) => {
        const list = await obtainListCallback(value);

        let newContent = '';
        for (let item of list)
        {
            const rendered = await renderCallback(item);
            newContent += rendered;
        }
        resultContainer.innerHTML = newContent;
        
        if (clickCallback)
        {
            const searchDropdownItems = resultContainer.querySelectorAll('.search-dropdown-item');
            
            searchDropdownItems.forEach((element) => {
                element.addEventListener('click', clickCallback, {useCapture: true});
            });
        }
    });
}

const setupDelayedChangeInput = (inputElement, callback) => {
    const invokeCallback = () => callback(inputElement.value);
    let keyupInterval;
    inputElement.addEventListener('keyup', (event) => {
        clearInterval(keyupInterval);
        keyupInterval = setTimeout(invokeCallback, 250);
    });
};

// Location-Specific Stuff

const locationClickHandler = (event) => {
    const origin = event.target;
    const locationId = origin.getAttribute('data-location-id');
    window.localStorage.setItem('kroger_location_id', locationId);
};

const lookupLocations = async (zipCode) => {
    const accessToken = window.localStorage.getItem('kroger_access_token');

    const response = await fetch(`http://localhost:7071/api/find-location?zipCode=${zipCode}`, {
        method: 'POST',
        body: JSON.stringify({
            'accessToken': accessToken,
        })
    });
    const responseJson = await response.json();

    return responseJson;
}

const lookupProducts = async (term) => {
    const accessToken = window.localStorage.getItem('kroger_access_token');

    const response = await fetch(`http://localhost:7071/api/search-products?term=${term}&locationId=${window.localStorage.getItem('kroger_location_id')}`, {
        method: 'POST',
        body: JSON.stringify({
            'accessToken': accessToken,
        })
    });
    const responseJson = await response.json();
    return responseJson;
}

/*
Creates an object by extracting the data properties from the given DOM element
*/
const elementToDataObject = (element) => {
    const result = {

    };

    for (let item of element.attributes)
    {
        let components = item.name.split('-');
        if (components[0] === 'data')
        {
            let currentObj = result;
            for (let i = 1; i < components.length; i++)
            {
                const key = components[i];
                const currentValue = currentObj[key];

                if (i === components.length-1)
                {
                    currentObj[key] = item.value;
                }
                else
                {
                    if (!currentValue)
                    {
                        currentObj[key] = {}
                    }

                    currentObj = currentObj[key];
                }
            }
        }
    }

    return result;
};