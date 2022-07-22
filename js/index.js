window.onload = async () => {
    const krogerLoginButton = document.getElementById('kroger-login-button');

    const currentSearchParams = new URLSearchParams(window.location.search);
    const code = currentSearchParams.get('code');

    if (code)
    {   
        const accessToken = await getKrogerAccess(code);
        window.localStorage.setItem('kroger_authorization_code', code);
        window.localStorage.setItem('kroger_access_token', accessToken);
        window.location.href = '../html/list.html';
        krogerLoginButton.innerHTML = '<div class="loader"></div>';
        krogerLoginButton.classList.add('no-pointer-events');
    } 
    else
    {
        krogerLoginButton.href = await fetchKrogerUrl();
    }
};

const getKrogerAccess = async (code) => {
    const krogerAccessUrl = `${config.KROGER_ACCESS_URL}?code=${code}`;

    const response = await fetch(krogerAccessUrl, {
        method: 'GET',
    });
    const responseJson = await response.json();
    return responseJson.access_token;
};

const fetchKrogerUrl = async () => {
    const krogerAuthUrl = config.KROGER_AUTHORIZATION_URL;
    
    const response = await fetch(krogerAuthUrl, {
        method: 'GET'
    });
    const responseJson = await response.json();
    return responseJson.url;
};
