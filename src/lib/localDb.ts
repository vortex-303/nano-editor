import { createStore, get, set, del, entries, type UseStore } from 'idb-keyval';

export const projectStore = createStore('nano-studio-projects', 'keyval');
export const workflowStore = createStore('nano-studio-workflows', 'keyval');
export const snippetStore = createStore('nano-studio-snippets', 'keyval');

export const putRecord = <T>(store: UseStore, id: string, value: T): Promise<void> =>
  set(id, value, store);

export const getRecord = <T>(store: UseStore, id: string): Promise<T | undefined> =>
  get<T>(id, store);

export const deleteRecord = (store: UseStore, id: string): Promise<void> =>
  del(id, store);

export const listRecords = async <T>(store: UseStore): Promise<T[]> => {
  const all = await entries<string, T>(store);
  return all.map(([, value]) => value);
};

export const newId = (): string => crypto.randomUUID();
