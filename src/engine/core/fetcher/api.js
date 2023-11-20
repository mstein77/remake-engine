const ApiFetcher = baseUrl => {
    return {
        fetch: (name, json) => {
            return fetch(baseUrl + name, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(json)
            }).then(response => {
                if (!response.ok) {
                    console.error('failed...');
                    throw Error('BOOM!');
                }
                return response.json();
            })
        }

    }
}

export default ApiFetcher