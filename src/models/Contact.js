import { get, post, patch, del } from 'src/lib/api';

class Contact {
  get(id) {
    return get(`/contacts/${id}/`);
  }

  post(data) {
    return post('/contacts/', data);
  }

  patch(data) {
    return patch(`/contacts/${data.id}/`, data);
  }

  del(id) {
    return del(`/contacts/${id}/`);
  }

  query() {
    const response = get('/contacts/');

    return response;
  }
}

export default new Contact();