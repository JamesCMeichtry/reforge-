// The signed-in person's id, set once at sign-in. Every "my data" query filters by it, so a physio or PT
// never sees their clients' rows mixed into their own training.
let current = null

export const setMe = (id) => {
  current = id
}

export const me = () => current
