import { component$ } from '@builder.io/qwik';
import { ProjectForm } from '~/components/project/ProjectForm';

export default component$(() => {
  return <ProjectForm mode="create" />;
});
