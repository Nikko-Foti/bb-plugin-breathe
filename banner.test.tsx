// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
const state=vi.hoisted(()=>({running:true,pending:false,enabled:true,popup:vi.fn()}));
vi.mock('@get-bb/plugin-sdk/app',async original=>({
  ...await original<typeof import('@get-bb/plugin-sdk/app')>(),
  experimental_Icon:()=>null,
  useComposer:()=>({scope:{kind:'thread',threadId:'one'},isRunning:state.running,experimental_openPopup:state.popup}),
  useSettings:()=>({values:{enabled:state.enabled,inhale:6,hold:7,exhale:8},isLoading:false}),
  useRealtimeConnectionState:()=> 'connected',
  experimental_useSidebarThreads:()=>({status:'ready',threads:[{id:'one',status:'active',runtimeStatus:'active',hasPendingInteraction:state.pending}]}),
}));
vi.mock('./components/breathe-wave',()=>({BreatheWave:()=> <div data-testid="wave" />}));
import { BreatheBanner } from './app';
afterEach(()=>{cleanup();state.running=true;state.pending=false;state.enabled=true;});
it('shows only while working and resumes after an interaction',()=>{
  state.running=false;const view=render(<BreatheBanner/>);expect(view.queryByTestId('wave')).toBeNull();
  state.running=true;view.rerender(<BreatheBanner/>);expect(view.getByTestId('wave')).toBeTruthy();
  state.pending=true;view.rerender(<BreatheBanner/>);expect(view.queryByTestId('wave')).toBeNull();
  state.pending=false;view.rerender(<BreatheBanner/>);expect(view.getByTestId('wave')).toBeTruthy();
  state.enabled=false;view.rerender(<BreatheBanner/>);expect(view.queryByTestId('wave')).toBeNull();
});
it('opens only its popup, does not submit, and resets Hide on the next turn',()=>{
  const submit=vi.fn(event=>event.preventDefault());const ui=()=> <form onSubmit={submit}><BreatheBanner/></form>;
  const view=render(ui());fireEvent.click(view.getByRole('button',{name:'Breathe settings'}));expect(state.popup).toHaveBeenCalledWith('settings');
  fireEvent.click(view.getByRole('button',{name:'Hide Breathe for this turn'}));expect(view.queryByTestId('wave')).toBeNull();expect(submit).not.toHaveBeenCalled();
  state.running=false;view.rerender(ui());state.running=true;view.rerender(ui());expect(view.getByTestId('wave')).toBeTruthy();
});
