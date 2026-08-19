import React, { useEffect, useState, useRef } from 'react';
import { UserWarning } from './UserWarning';
import {
  USER_ID,
  addTodo,
  deleteTodo,
  getTodos,
  updateTodo,
} from './api/todos';
import { Todo } from './types/Todo';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { Selected } from './types/Selected';
import { ErrorMessage } from './types/ErrorMessage';
import { Filter } from './types/Filter';
import { TempTodo } from './components/TempTodo';

const filters: Filter[] = [
  {
    title: 'All',
    value: 'all',
    href: '#/',
    dataCy: 'All',
  },
  {
    title: 'Active',
    value: 'active',
    href: '#/active',
    dataCy: 'Active',
  },
  {
    title: 'Completed',
    value: 'completed',
    href: '#/completed',
    dataCy: 'Completed',
  },
];

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const [selectedFilterLink, setSelectedFilterLink] = useState<Selected>('all');
  const [error, setError] = useState<string>('');

  const [blockedInput, setBlockedInput] = useState(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const [deletingTodoId, setDeletingTodoId] = useState<number | null>(null);

  const timerError = useRef<NodeJS.Timeout | null>(null);

  const filteredTodos = todos.filter(todo => {
    switch (selectedFilterLink) {
      case 'all':
        return true;

      case 'active':
        return !todo.completed;

      case 'completed':
        return todo.completed;

      default:
        return false;
    }
  });

  const allCompleted = todos.length > 0 && todos.every(todo => todo.completed);

  const todosCounter = todos.reduce((curr, todo) => {
    return !todo.completed ? curr + 1 : curr;
  }, 0);

  const hasCompletedTodos = todos.some(todo => todo.completed);

  const completedAllTodos = () => {
    setTodos(
      todos.map(todo => {
        const copyTodo = { ...todo };

        if (allCompleted) {
          copyTodo.completed = false;
        } else {
          copyTodo.completed = true;
        }

        return copyTodo;
      }),
    );
  };

  const handleAddTodo = (newTitle: string) => {
    setBlockedInput(true);

    setTempTodo({
      id: 0,
      userId: USER_ID,
      title: newTitle,
      completed: false,
    });

    return addTodo({
      userId: USER_ID,
      title: newTitle,
      completed: false,
    })
      .then(data => {
        setBlockedInput(false);
        setTempTodo(null);

        setTodos(currentTodos => [...currentTodos, data]);

        return true;
      })
      .catch(() => {
        setBlockedInput(false);
        setTempTodo(null);

        setError(ErrorMessage.Add);

        return false;
      });
  };

  function checkedTodoComleted(id: number, completed: boolean) {
    setError('');

    updateTodo(id, completed)
      .then(data => {
        setTodos(
          todos.map(todo => {
            if (data.id === id) {
              return data;
            }

            return todo;
          }),
        );
      })
      .catch(() => setError(ErrorMessage.Update));
  }

  function removeTodo(id: number) {
    setError('');

    setBlockedInput(true);
    setDeletingTodoId(id);

    deleteTodo(id)
      .then(() => {
        const newTodosWithOutDelete = todos.filter(todo => todo.id !== id);

        setTodos(newTodosWithOutDelete);
        setBlockedInput(false);
        setDeletingTodoId(null);
      })
      .catch(() => {
        setError(ErrorMessage.Delete);
        setBlockedInput(false);
        setDeletingTodoId(null);
      });
  }

  async function clearCompleted() {
    setError('');
    setBlockedInput(true);

    const completedTodos = todos.filter(todo => todo.completed);
    const deleteRequests = completedTodos.map(todo => deleteTodo(todo.id));

    const results = await Promise.allSettled(deleteRequests);

    const successfullyDeletedTodos = results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return completedTodos[index];
        }

        return null;
      })
      .filter(result => result !== null);

    setTodos(todos.filter(todo => !successfullyDeletedTodos.includes(todo)));
    setBlockedInput(false);

    const isRejected = results.some(result => result.status === 'rejected');

    if (isRejected) {
      setError(ErrorMessage.Delete);
    }
  }

  useEffect(() => {
    setError('');

    getTodos()
      .then(data => {
        setTodos(data);
      })
      .catch(() => setError(ErrorMessage.Load));
  }, []);

  useEffect(() => {
    if (error === '') {
      return;
    }

    if (timerError.current !== null) {
      clearTimeout(timerError.current);
    }

    timerError.current = setTimeout(() => {
      setError('');
    }, 3000);

    return () => {
      if (timerError.current === null) {
        return;
      }

      clearTimeout(timerError.current);
    };
  }, [error]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          completedAllTodos={completedAllTodos}
          allCompleted={allCompleted}
          blockedInput={blockedInput}
          setError={setError}
          handleAddTodo={handleAddTodo}
        />

        {todos.length > 0 && (
          <>
            <TodoList
              todos={filteredTodos}
              checkedTodoComleted={checkedTodoComleted}
              removeTodo={removeTodo}
              deletingTodoId={deletingTodoId}
            />

            <Footer
              selectedFilterLink={selectedFilterLink}
              setSelectedFilterLink={setSelectedFilterLink}
              todosCounter={todosCounter}
              hasCompletedTodos={hasCompletedTodos}
              clearCompleted={clearCompleted}
              filters={filters}
            />
          </>
        )}

        {tempTodo !== null && <TempTodo todo={tempTodo} />}
      </div>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${error === '' ? 'hidden' : ''}`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setError('')}
        />
        <p>{error}</p>
      </div>
    </div>
  );
};
