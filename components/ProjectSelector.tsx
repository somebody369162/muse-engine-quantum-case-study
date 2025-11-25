


import React, { useState, useRef, useEffect } from 'react';
import type { Project } from '../types';
import { Icon } from './Icon';

interface ProjectSelectorProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (projectId: string) => void;
  onAddProject: () => void;
  onRenameProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onReorderProjects: (draggedId: string, targetId: string) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, activeProject, onSelectProject, onAddProject, onRenameProject, onDeleteProject, onReorderProjects }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (projectId: string) => {
    onSelectProject(projectId);
    setIsOpen(false);
  };

  const handleAdd = () => {
    onAddProject();
    setIsOpen(false);
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, projectId: string) => {
    e.dataTransfer.setData('text/plain', projectId);
    e.currentTarget.style.opacity = '0.5';
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
      e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetProjectId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    onReorderProjects(draggedId, targetProjectId);
    e.currentTarget.style.borderTop = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderTop = '2px solid var(--accent-primary)';
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
      e.currentTarget.style.borderTop = '';
  };


  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        title="Switch or manage projects"
      >
        <Icon name="folder-open" className="w-6 h-6 text-[var(--accent-primary)]" />
        <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] hidden md:block">{activeProject.name}</span>
        <Icon name="chevron-down" className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-10 animate-fade-in-down overflow-hidden">
          <ul className="py-2 max-h-72 overflow-y-auto">
            {projects.map(project => (
              <li 
                key={project.id} 
                className="group flex items-stretch justify-between transition-all duration-150 px-2 cursor-grab"
                draggable
                onDragStart={(e) => handleDragStart(e, project.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, project.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                title="Drag to reorder"
               >
                 <button
                  onClick={() => handleSelect(project.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-md my-0.5 ${
                    project.id === activeProject.id
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                  title={`Switch to "${project.name}"`}
                >
                  <Icon name="folder" className="w-4 h-4" />
                  <span className="truncate flex-grow">{project.name}</span>
                
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                      <button 
                          onClick={(e) => { e.stopPropagation(); onRenameProject(project.id); }} 
                          className="p-1.5 rounded-full hover:bg-white/20"
                          title="Rename project"
                      >
                          <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} 
                          className="p-1.5 rounded-full hover:bg-white/20"
                          title="Delete project"
                      >
                          <Icon name="trash" className="w-4 h-4" />
                      </button>
                  </div>
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={handleAdd}
                className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-3 mt-2 border-t border-[var(--border-primary)]"
                title="Create a new project"
              >
                <Icon name="plus" className="w-4 h-4" />
                Create New Project
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};