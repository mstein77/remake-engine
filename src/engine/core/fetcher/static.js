import resourceInfo from "../../../../tmp/resources-info"
import { ResourceDependencies } from "helper/shared"

const StaticFetcher = baseUrl => {
    const cache = resourceInfo.cache
    const dependencies = new ResourceDependencies(
        () => resourceInfo.direct,
        () => null,
        () => resourceInfo.indirect,
        () => null,
        () => null
    )
    return {
        fetch: (name, json) => {
            const found = []
            const notFound = []
            const invalid = []

            const { resources = [], screen, resolved, overwrites, remotes } = json
            const relevant = dependencies.getRelevantScreenResources(screen, resolved, overwrites, remotes)
            for (let resId of relevant.found) {
                const [ type, id ] = resId.split(':')
                resources.push({ id, type })
            }
            for (let resId of relevant.notFound) {
                const [type, id] = resId.split(':')
                notFound.push({ id, type })
            }
            const promises = []
            for (const resource of resources) {
                const id = resource.id
                const type = resource.type
                const ext = type === 'json' ? '.json' : ''
                const cached = cache[type][id]
                if (cached) {
                    promises.push(Promise.resolve({
                        id, type, data: cached
                    }))
                    continue
                }
                promises.push(
                    resourceInfo.static[type].includes(id) ?
                        fetch(baseUrl + resource.type + '/' + resource.id + ext)
                            .then(response => {
                                if (response.status === 404) {
                                    return Promise.resolve(null)
                                }
                                if (!response.ok) {
                                    throw new Error(`HTTP error! Status: ${response.status}`)
                                }
                                return resource.type === 'json' ? response.json() : response.blob()
                            })
                            .then(data => {
                                if (data !== null && resource.type !== 'json') {
                                    data = URL.createObjectURL(data)
                                }
                                cache[resource.type][id] = data
                                return {
                                    id,
                                    type,
                                    data
                                }
                            }) :
                        Promise.resolve({
                            id,
                            type,
                            data: null
                        })
                )
            }
            return Promise.all(promises).then(resources => {
                for(const resource of resources) {
                    if (resource.data === null) {
                        notFound.push(resource)
                    } else {
                        found.push(resource)
                    }
                }
                return {
                    found,
                    notFound,
                    invalid
                }
            })
        }
    }
}

export default StaticFetcher