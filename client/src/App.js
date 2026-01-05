const WrapperModernPersonaEditor = () => { const { personaId } = useParams(); return <ModernPersonaEditor personaId={personaId} onClose={() => window.history.back()} />; };
