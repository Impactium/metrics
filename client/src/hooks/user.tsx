export namespace User {
  export interface Type {
    id: string;
    email: string;
  }

  export async function use() {
    return fetch('/api/auth/profile', {
      method: 'GET',
      credentials: 'include',
      next: { tags: ['profile' ] }
    }).then(response => response.json().then(payload => typeof payload.data.id === 'undefined' ? null : payload.data));
  }

  export const avatar = (user: User.Type) => `http://cdn.impactium.dev/users/${user.id}.jpg`;
}
