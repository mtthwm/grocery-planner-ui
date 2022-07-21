
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

    this.render = () => {
        const content = this._list.map((item, index) => {
            return this._renderProduct(item, index)
        }).join('');
        this._container.innerHTML = content;  
        this._applyEventListeners();
    };
};


// Render functions
const renderLocation = (location) => {
    return (`<div class="search-dropdown-item" data-location-id="${location.locationId}"><p>${location.name}</p></div>`);
};

const renderProducts = (product) => {
    const thumbnailUrl = product.images[0].sizes.find(image => image.size === 'thumbnail').url;
    return (`
    <div class="search-dropdown-item" 
    data-product-description="${product.description}" 
    data-product-thumbnail="${thumbnailUrl}"
    data-product-id="${product.productId}"
    data-product-size="${product.items[0].size}">
        <div class="row align-center">
            <p>${product.description} - ${product.items[0].price.regular}</p>
            <img class="ml-auto" src=${thumbnailUrl}/>
        </div>
    </div>`);
}

window.onload = () => {
    const groceryList = new GroceryList(document.querySelector('#item-container > .list-container'));

    const productClickHandler = (event) => {
        const origin = event.target;
        const dataObject = elementToDataObject(origin);
        const data = dataObject.product;
        groceryList.add(data);
    }

    setUpSearchDropdown(document.getElementById('location-container'), lookupLocations, renderLocation, locationClickHandler);
    setUpSearchDropdown(document.getElementById('add-container'), lookupProducts, renderProducts, productClickHandler);
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